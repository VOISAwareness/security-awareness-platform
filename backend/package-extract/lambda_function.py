"""
package-extract: unpack a training package's zip once, on the server.

The Training screen used to fetch a package's whole zip through a presigned
S3 link and unzip it in the browser on every play: slow for a big course, and
blocked by the bucket's CORS on any origin but localhost. This unpacks it
once, when the package is saved, so a player can load the course's files
one by one, like any web page (served later from the app's own origin).

Invoked asynchronously by reference-api after POST /training/packages, with
{"packageId": "SP-001"} (and by seed-data/extract_training_packages.py for
packages saved before this existed). It

- reads the row and its zip (uploads/training-packages/<uploadId>/<file>.zip),
- writes every file to training-content/<uploadId>/<path in the zip>, with
  its Content-Type, refusing unsafe paths (absolute, "..") and zip bombs
  (too many files, too many bytes once unpacked),
- finds what to open: the SCORM manifest's (imsmanifest.xml) first item, or
  else an index.html / story.html,
- and records on the row ContentStatus (EXTRACTING -> READY | FAILED),
  ContentPrefix, LaunchPath, ScormVersion ("1.2", "2004" or none for plain
  HTML5), ContentFiles, ContentBytes, ExtractedAt; ContentError when FAILED.

Every row write is conditional on the row still holding the same zip, so a
package deleted or replaced meanwhile is never brought back; its unpacked
files are removed instead. Running it again for a package rewrites the same
files, so it is safe to repeat.
"""
import json
import mimetypes
import os
import posixpath
import re
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

TABLE_PREFIX = os.environ["TABLE_PREFIX"]
UPLOAD_BUCKET = os.environ["UPLOAD_BUCKET"]

PACKAGE_KEY_RE = re.compile(r"uploads/training-packages/([0-9a-f]{32})/[A-Za-z0-9._-]{1,200}\.zip")
CONTENT_PREFIX = "training-content/"
# Zip bomb guards. The largest real course so far is 94 MB zipped, ~3,000 files.
MAX_FILES = 20_000
MAX_UNPACKED_BYTES = 2 * 1024 * 1024 * 1024
MAX_MANIFEST_BYTES = 5 * 1024 * 1024
MAX_PATH_CHARS = 900  # S3 keys stop at 1,024 bytes; leaves room for the prefix
UPLOAD_THREADS = 16
SKIPPED = re.compile(r"(^|/)(__MACOSX/|\.DS_Store$|Thumbs\.db$)")

# Types mimetypes may not know (or knows differently on Lambda's image).
TYPES = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".xml": "application/xml",
    ".xsd": "application/xml",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".vtt": "text/vtt",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".txt": "text/plain; charset=utf-8",
    ".pdf": "application/pdf",
    ".swf": "application/x-shockwave-flash",
}

s3 = boto3.client("s3", config=Config(max_pool_connections=UPLOAD_THREADS + 4, retries={"mode": "standard"}))
dynamodb = boto3.resource("dynamodb")


class Refused(Exception):
    """A zip that cannot be played; the message is shown on the package."""


def log(context, message, **fields):
    """One structured log line. Never pass file contents."""
    print(json.dumps({"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}))


def table():
    return dynamodb.Table(f"{TABLE_PREFIX}-training-packages")


def content_type(path):
    ext = posixpath.splitext(path)[1].lower()
    return TYPES.get(ext) or mimetypes.guess_type(path)[0] or "application/octet-stream"


def safe_path(name):
    """A zip entry's path as it may be written under the package's folder, or
    None for one that must not be (absolute, climbing out with "..", empty)."""
    path = name.replace("\\", "/")
    if path.startswith("/") or re.match(r"^[A-Za-z]:", path):
        return None
    parts = [p for p in path.split("/") if p not in ("", ".")]
    if not parts or any(p == ".." for p in parts) or any(ord(c) < 32 for c in path):
        return None
    joined = "/".join(parts)
    return joined if len(joined) <= MAX_PATH_CHARS else None


def files_of(zf):
    """[(ZipInfo, path)] for the files to write, after the safety checks."""
    entries, total = [], 0
    for info in zf.infolist():
        if info.is_dir() or SKIPPED.search(info.filename.replace("\\", "/")):
            continue
        path = safe_path(info.filename)
        if path is None:
            raise Refused(f"The zip has a file with an unsafe path: {info.filename[:120]!r}")
        if info.flag_bits & 0x1:
            raise Refused("The zip is password-protected")
        total += info.file_size
        entries.append((info, path))
        if len(entries) > MAX_FILES:
            raise Refused(f"The zip has more than {MAX_FILES:,} files")
        if total > MAX_UNPACKED_BYTES:
            raise Refused(f"The zip unpacks to more than {MAX_UNPACKED_BYTES // 1024 ** 3} GB")
    if not entries:
        raise Refused("The zip is empty")
    return entries, total


# --- what to open --------------------------------------------------------------


def local(tag):
    return tag.rsplit("}", 1)[-1]


def children(el, name):
    return [c for c in el if local(c.tag) == name]


def attr(el, name):
    """An attribute by its local name, whatever namespace it is in."""
    for key, value in el.attrib.items():
        if local(key) == name:
            return value
    return None


def scorm_version(root, raw):
    """'1.2', '2004' or None (a manifest that names neither)."""
    for meta in children(root, "metadata"):
        for sv in children(meta, "schemaversion"):
            text = (sv.text or "").strip().lower()
            if text == "1.2":
                return "1.2"
            if "2004" in text or text.startswith("cam 1.3"):
                return "2004"
    text = raw.decode("utf-8", "replace").lower()
    if "adlcp_rootv1p2" in text:
        return "1.2"
    if "adlcp_v1p3" in text or "adlcp_v1p2" in text:  # 2004 2nd ed. used v1p2 for the ADL CP
        return "2004"
    return None


def join_base(*parts):
    """xml:base folders and an href joined as one relative path."""
    return posixpath.join(*[p for p in parts if p]) if any(parts) else ""


def manifest_launch(raw):
    """(launch href relative to the manifest's folder, SCORM version) from an
    imsmanifest.xml; href None when it names nothing to open."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        raise Refused(f"imsmanifest.xml is not valid XML ({e})") from None
    version = scorm_version(root, raw)
    resources_el = next(iter(children(root, "resources")), None)
    resources = {}
    res_base = attr(resources_el, "base") if resources_el is not None else None
    ordered = []
    if resources_el is not None:
        for res in children(resources_el, "resource"):
            href = attr(res, "href")
            if not href:
                continue
            full = join_base(res_base, attr(res, "base"), href)
            resources[attr(res, "identifier")] = full
            ordered.append((res, full))

    def first_item(el):
        for item in children(el, "item"):
            ref = attr(item, "identifierref")
            if ref and ref in resources:
                params = attr(item, "parameters") or ""
                href = resources[ref]
                if params:
                    params = params.lstrip("?&")
                    href += ("&" if "?" in href else "?") + params
                return href
            found = first_item(item)
            if found:
                return found
        return None

    orgs = next(iter(children(root, "organizations")), None)
    if orgs is not None:
        default = attr(orgs, "default")
        candidates = children(orgs, "organization")
        candidates.sort(key=lambda o: attr(o, "identifier") != default)
        for org in candidates:
            href = first_item(org)
            if href:
                return href, version
    for res, href in ordered:
        if (attr(res, "scormtype") or attr(res, "scormType") or "").lower() == "sco":
            return href, version
    return (ordered[0][1] if ordered else None), version


def launch_of(zf, entries):
    """(LaunchPath inside the content folder, ScormVersion or None)."""
    info_of = {p: i for i, p in entries}
    paths = list(info_of)
    by_lower = {p.lower(): p for p in paths}
    manifests = sorted((p for p in paths if posixpath.basename(p).lower() == "imsmanifest.xml"), key=lambda p: (p.count("/"), p))
    if manifests:
        mpath = manifests[0]
        info = info_of[mpath]
        if info.file_size > MAX_MANIFEST_BYTES:
            raise Refused("imsmanifest.xml is too large")
        href, version = manifest_launch(zf.read(info))
        if href:
            if "://" in href:
                raise Refused("The SCORM manifest opens a page on another site")
            file_part, sep, query = href.partition("?")
            target = safe_path(posixpath.join(posixpath.dirname(mpath), file_part))
            hit = by_lower.get((target or "").lower())
            if not hit:
                raise Refused(f"The SCORM manifest opens {file_part!r}, which is not in the zip")
            return hit + (sep + query if query else ""), version
    for name in ("index.html", "index_lms.html", "story.html", "index.htm"):
        shallow = sorted((p for p in paths if posixpath.basename(p).lower() == name), key=lambda p: (p.count("/"), p))
        if shallow:
            return shallow[0], None
    html = sorted((p for p in paths if p.lower().endswith((".html", ".htm"))), key=lambda p: (p.count("/"), p))
    if html:
        return html[0], None
    raise Refused("The zip has no imsmanifest.xml and no HTML page to open")


# --- the work ------------------------------------------------------------------


def delete_prefix(prefix):
    keys = [
        {"Key": obj["Key"]}
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=UPLOAD_BUCKET, Prefix=prefix)
        for obj in page.get("Contents", [])
    ]
    for i in range(0, len(keys), 1000):
        s3.delete_objects(Bucket=UPLOAD_BUCKET, Delete={"Objects": keys[i : i + 1000], "Quiet": True})
    return len(keys)


def upload_all(zip_path, entries, prefix):
    """Every file to S3, several at a time (each thread opens the zip itself:
    a ZipFile is not safe to read from two threads)."""

    def put(chunk):
        with zipfile.ZipFile(zip_path) as zf:
            for info, path in chunk:
                with zf.open(info) as src:
                    s3.upload_fileobj(
                        src,
                        UPLOAD_BUCKET,
                        prefix + path,
                        ExtraArgs={"ContentType": content_type(path), "CacheControl": "private, max-age=86400"},
                    )

    chunks = [entries[i::UPLOAD_THREADS] for i in range(UPLOAD_THREADS)]
    with ThreadPoolExecutor(max_workers=UPLOAD_THREADS) as pool:
        for f in [pool.submit(put, c) for c in chunks if c]:
            f.result()


def set_row(package_id, key, values, remove=()):
    """Update the row only while it still holds this zip; False when it
    no longer does (deleted or replaced meanwhile)."""
    names = {f"#{k}": k for k in values}
    names["#key"] = "PackageKey"
    expr = "SET " + ", ".join(f"#{k} = :{k}" for k in values)
    if remove:
        names.update({f"#{k}": k for k in remove})
        expr += " REMOVE " + ", ".join(f"#{k}" for k in remove)
    try:
        table().update_item(
            Key={"PackageID": package_id},
            UpdateExpression=expr,
            ConditionExpression="#key = :key",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues={**{f":{k}": v for k, v in values.items()}, ":key": key},
        )
        return True
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return False
        raise


def extract(package_id, context=None):
    """Unpack one package. Returns the row's new content fields (or None when
    there is nothing to do: no such row, or not a zip this API made)."""
    row = table().get_item(Key={"PackageID": package_id}).get("Item")
    key = (row or {}).get("PackageKey")
    match = PACKAGE_KEY_RE.fullmatch(key or "")
    if not match:
        log(context, "package not extracted: no row or no zip", packageId=package_id)
        return None
    prefix = f"{CONTENT_PREFIX}{match.group(1)}/"
    if not set_row(package_id, key, {"ContentStatus": "EXTRACTING"}, remove=("ContentError",)):
        return None
    log(context, "package extract started", packageId=package_id)
    try:
        with tempfile.TemporaryDirectory(dir="/tmp") as tmp:
            zip_path = os.path.join(tmp, "package.zip")
            s3.download_file(UPLOAD_BUCKET, key, zip_path)
            try:
                with zipfile.ZipFile(zip_path) as zf:
                    entries, total = files_of(zf)
                    launch, version = launch_of(zf, entries)
            except zipfile.BadZipFile:
                raise Refused("The file is not a readable zip") from None
            # a re-run starts clean, so files the zip no longer has do not linger
            delete_prefix(prefix)
            upload_all(zip_path, entries, prefix)
    except Refused as why:
        set_row(package_id, key, {"ContentStatus": "FAILED", "ContentError": str(why)[:300]})
        log(context, "package refused", packageId=package_id, reason=str(why)[:300])
        return {"ContentStatus": "FAILED", "ContentError": str(why)[:300]}
    except Exception:
        set_row(package_id, key, {"ContentStatus": "FAILED", "ContentError": "Unpacking failed; try again"})
        raise
    fields = {
        "ContentStatus": "READY",
        "ContentPrefix": prefix,
        "LaunchPath": launch,
        "ContentFiles": len(entries),
        "ContentBytes": total,
        "ExtractedAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if version:
        fields["ScormVersion"] = version
    if not set_row(package_id, key, fields, remove=() if version else ("ScormVersion",)):
        removed = delete_prefix(prefix)
        log(context, "package gone meanwhile; files removed", packageId=package_id, files=removed)
        return None
    log(context, "package extracted", packageId=package_id, files=len(entries), bytes=total, scorm=version or "none")
    return fields


def lambda_handler(event, context):
    package_id = (event or {}).get("packageId")
    if not isinstance(package_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", package_id):
        log(context, "package extract: bad event")
        return {"ok": False}
    result = extract(package_id, context)
    return {"ok": bool(result and result.get("ContentStatus") == "READY"), "packageId": package_id}
