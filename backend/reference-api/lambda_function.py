"""
reference-api: read access to the reference-data tables (and full CRUD for
sender-identities, which is the first screen wired to the backend).

One HTTP API (v2) Lambda, routed by `routeKey`. Table names are derived from a
single TABLE_PREFIX env var. Responses are JSON with a {data,...}/{error}
envelope; DynamoDB numbers are serialized as JSON numbers. CORS is handled at
the API-Gateway level, so responses carry no Access-Control headers themselves.
"""
import decimal
import json
import os
import re
import uuid
import zlib
from datetime import UTC, datetime
from urllib.parse import unquote, urlsplit

import boto3
from boto3.dynamodb.conditions import Key
from botocore.config import Config
from botocore.exceptions import ClientError

TABLE_PREFIX = os.environ["TABLE_PREFIX"]
UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET")
INGEST_FUNCTION = os.environ.get("INGEST_FUNCTION")
dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")
lambda_client = boto3.client("lambda")


def table(name):
    return dynamodb.Table(f"{TABLE_PREFIX}-{name}")


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def ok(data, **extra):
    return respond(200, {"data": data, **extra})


def err(status, message, **extra):
    return respond(status, {"error": {"message": message, **extra}})


def log(context, message, **fields):
    """One structured log line. Never pass emails, bodies or tokens."""
    print(
        json.dumps(
            {"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}
        )
    )


def conditional_failed(e):
    return e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException"


def scan_all(name, **scan_kwargs):
    """Return every item in a (small) table, following pagination."""
    tbl = table(name)
    items, kwargs = [], dict(scan_kwargs)
    while True:
        resp = tbl.scan(**kwargs)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            return items
        kwargs["ExclusiveStartKey"] = lek


def get_one(name, key):
    item = table(name).get_item(Key=key).get("Item")
    return item


def parse_body(event):
    raw = event.get("body")
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    return json.loads(raw)


# DynamoDB's hard limit is 400 KB per item; leave headroom for what we add.
MAX_ITEM_BYTES = 380 * 1024

# Cover images the browser may upload. Anything else is refused before signing,
# so an arbitrary file type can never reach the bucket through a presigned PUT.
COVER_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def too_large(item):
    """Return the offending size in bytes if the item exceeds the DynamoDB cap."""
    size = len(json.dumps(item, cls=DecimalEncoder).encode("utf-8"))
    return size if size > MAX_ITEM_BYTES else 0


def size_error(size):
    return err(
        413,
        (
            f"Scenario is too large to save ({size // 1024} KB; limit "
            f"{MAX_ITEM_BYTES // 1024} KB). This usually means images were pasted "
            "into the email or landing page as embedded data. Link to images "
            "instead of embedding them."
        ),
    )


# Points one gamification rule may award (positive) or deduct (negative).
POINTS_LIMIT = 1000


def parse_points(value):
    """Return (points, None) for a whole number within +/-POINTS_LIMIT, else
    (None, message). Booleans are refused: JSON true would otherwise read as 1."""
    if isinstance(value, bool):
        return None, "PointsAssigned must be a whole number"
    try:
        number = decimal.Decimal(str(value).strip())
    except (decimal.InvalidOperation, ValueError):
        return None, "PointsAssigned must be a whole number"
    if not number.is_finite() or number != number.to_integral_value():
        return None, "PointsAssigned must be a whole number"
    if abs(number) > POINTS_LIMIT:
        return None, f"PointsAssigned must be between -{POINTS_LIMIT} and {POINTS_LIMIT}"
    return int(number), None


def next_sequence_id(rows, key_attr, prefix):
    """Continue a PREFIX-00N sequence, ignoring rows that don't match the shape."""
    nums = []
    pattern = rf"^{re.escape(prefix)}-(\d+)$"
    for row in rows:
        m = re.match(pattern, str(row.get(key_attr, "")))
        if m:
            nums.append(int(m.group(1)))
    return f"{prefix}-{(max(nums) + 1) if nums else 1:03d}"


def safe_name(name):
    return re.sub(r"[^A-Za-z0-9._-]", "_", str(name))


def cover_image_key(scenario_id, file_name):
    """S3 key for a scenario cover. Both segments are sanitized because the
    scenario id is typed by the user in the wizard, not generated."""
    return f"uploads/scenario-covers/{safe_name(scenario_id)}/{safe_name(file_name)}"


def delete_s3_prefix(bucket, prefix):
    """Remove every object under a prefix (re-uploads leave earlier versions
    behind). Best effort: a failure is logged and swallowed so it can never
    block the DynamoDB delete it accompanies."""
    try:
        paginator = s3_client.get_paginator("list_objects_v2")
        to_delete = [
            {"Key": obj["Key"]}
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix)
            for obj in page.get("Contents", [])
        ]
        for i in range(0, len(to_delete), 1000):
            s3_client.delete_objects(
                Bucket=bucket, Delete={"Objects": to_delete[i : i + 1000]}
            )
    except ClientError as e:
        print(json.dumps({"message": "S3 cleanup failed", "prefix": prefix, "error": str(e)}))


def sign_cover(item):
    """Uploaded covers live in a private bucket, so a bare URL would 403. Swap
    the stored key for a presigned GET. CoverImageID stays a string, so the
    response shape is unchanged and the UI's existing resolver handles it.
    The stored key rides along as coverImageKey (response only), so an editor
    can save the row back without persisting a URL that expires in an hour."""
    key = (item or {}).get("CoverImageID", "")
    if not UPLOAD_BUCKET or not str(key).startswith("uploads/"):
        return item
    signed = dict(item)
    signed["CoverImageID"] = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": UPLOAD_BUCKET, "Key": key},
        ExpiresIn=3600,
    )
    signed["coverImageKey"] = key
    return signed


def cover_key_from_url(value):
    """Undo sign_cover for a cover sent back by the browser: a presigned
    uploads/ URL becomes its S3 key again, so a saved row never holds a link
    that stops working an hour later. Anything else (keys, catalogue names,
    plain links) passes through untouched."""
    if not isinstance(value, str):
        return value
    parts = urlsplit(value.strip())
    if parts.scheme not in ("http", "https") or "X-Amz-" not in parts.query:
        return value
    path = unquote(parts.path)
    start = path.find("/uploads/")
    return path[start + 1 :] if start >= 0 else value


# --- scenario ownership -------------------------------------------------
# Identity is CLIENT-ASSERTED until sign-in (Entra ID) exists: the browser
# names the viewer (GET ?viewer=), the author (POST createdBy) and the actor
# (PUT body / DELETE ?actor=). These rules keep honest users out of each
# other's way; they are NOT a security boundary -- anyone can claim any address.
#
# Row kinds (scenario_kind):
#   template  no createdBy: the fixed seed scenarios, visible to everyone.
#   own       a user's scenario. Private until a SENT campaign uses it, then
#             shared with everyone and frozen -- edits go through a revision.
#   copy      copyOf=X: its owner's private edited version of template / shared X,
#             a scenario of its own: X stays as it is and is still listed, and
#             one person may make any number of versions of X.
#   revision  revisionOf=S: its owner's pending edit of their own shared S,
#             published onto S once a campaign that used it has been SENT.
# The handler only does I/O; every rule lives in the pure helpers below.

# Kept from the original when a revision's content is published onto it.
PUBLISH_KEPT_FIELDS = frozenset(
    {"scenarioId", "createdBy", "CreatedOn", "copyOf", "revisionOf", "publishedAt", "deletedAt", "deletedBy"}
)
# A PUT can't change who owns a row, where it came from, or whether it was deleted.
PUT_LOCKED_FIELDS = frozenset(
    {"scenarioId", "createdBy", "copyOf", "revisionOf", "publishedAt", "deletedAt", "deletedBy"}
)
# Set only by DELETE of a shared scenario (see deleted_scenario).
DELETE_MARK_FIELDS = frozenset({"deletedAt", "deletedBy"})
# Response-only annotations (and PUT's actor): dropped from every body.
NEVER_STORED_FIELDS = frozenset({"ownership", "isShared", "replaces", "coverImageKey", "actor"})


def parse_identity(value):
    """A client-asserted email (viewer, actor, createdBy) in comparable form:
    trimmed and lower-cased; '' when absent or not a string."""
    return value.strip().lower() if isinstance(value, str) else ""


def campaign_scenario_refs(campaign_rows):
    """(referenced, sent): ids of scenarios any campaign references, in any
    status, and the subset a SENT campaign used -- what makes a user's scenario
    shared and a revision publishable. Reads legacy rows too (CampaignStatus,
    ScenarioID) and any status casing."""
    referenced, sent = set(), set()
    for row in campaign_rows:
        ids = {str(row[attr]) for attr in ("scenarioId", "ScenarioID") if row.get(attr)}
        referenced |= ids
        status = row.get("status") or row.get("CampaignStatus") or ""
        if str(status).strip().upper() == "SENT":
            sent |= ids
    return referenced, sent


def sent_scenario_ids(campaign_rows):
    return campaign_scenario_refs(campaign_rows)[1]


def next_scenario_id(rows, referenced_ids):
    """The next SC-00N id, past every id a row OR a campaign has ever used.
    "Sent" is tracked by id, so a reissued id would inherit an old campaign's
    history: a new scenario born shared, a new revision published unreviewed.
    So an id stays retired after its row is deleted if any campaign used it."""
    used = [*rows, *({"scenarioId": sid} for sid in referenced_ids)]
    return next_sequence_id(used, "scenarioId", "SC")


def sequence_order(scenario_id):
    """Sort key putting SC-999 before SC-1000 (API ids grow with age)."""
    m = re.match(r"^SC-(\d+)$", str(scenario_id))
    return (0, int(m.group(1)), "") if m else (1, 0, str(scenario_id))


def scenario_kind(row):
    if row.get("copyOf"):
        return "copy"
    if row.get("revisionOf"):
        return "revision"
    return "own" if parse_identity(row.get("createdBy")) else "template"


def is_deleted(row):
    """A shared scenario its owner deleted: kept so the campaigns that used it
    still resolve, but gone from every list."""
    return bool((row or {}).get("deletedAt"))


def is_shared(row, sent_ids):
    """A user's own scenario is shared once a SENT campaign has used it."""
    return scenario_kind(row) == "own" and str(row.get("scenarioId")) in sent_ids


def visible_scenarios(rows, sent_ids, viewer):
    """The rows `viewer` may see, each annotated (response only) with
    ownership, isShared and replaces. The viewer's pending revision stands in
    for their own shared scenario -- for them alone. Their copies are listed
    beside what they copy: a template (or someone else's shared scenario) is
    never hidden. Published revisions are hidden, and so are deleted scenarios
    and the pending revisions of one."""
    viewer = parse_identity(viewer)
    deleted = {str(r.get("scenarioId")) for r in rows if is_deleted(r)}
    rows = [
        r
        for r in rows
        if not is_deleted(r) and not (scenario_kind(r) == "revision" and str(r["revisionOf"]) in deleted)
    ]

    def mine(row):
        return bool(viewer) and parse_identity(row.get("createdBy")) == viewer

    revised = {
        str(row["revisionOf"])
        for row in rows
        if mine(row) and not row.get("publishedAt") and scenario_kind(row) == "revision"
    }

    visible = []
    for row in rows:
        kind, sid = scenario_kind(row), str(row.get("scenarioId"))
        shared, replaces = is_shared(row, sent_ids), None
        if kind == "template":
            ownership = "template"
        elif kind == "own" and mine(row):
            if sid in revised:
                continue
            ownership = "mine"
        elif kind == "own":
            if not shared:
                continue
            ownership = "shared"
        elif kind == "copy":
            # Listed beside the scenario it copies, which it never replaces.
            if not mine(row):
                continue
            ownership = "myCopy"
        else:
            if not mine(row) or row.get("publishedAt"):
                continue
            ownership = "myRevision"
            replaces = str(row["revisionOf"])
        visible.append({**row, "ownership": ownership, "isShared": shared, "replaces": replaces})
    return visible


def publishable_revisions(rows, sent_ids):
    """Revisions due for lazy publish: unpublished, used by a SENT campaign,
    and by the same author as the original they revise. Returns
    (revision, original, merged_original) tuples, where merged_original is the
    original with the revision's content but its own identity fields. Oldest
    first, so if two revisions of one original are due, the newest lands last."""
    by_id = {str(row.get("scenarioId")): row for row in rows}
    plan = []
    for rev in sorted(rows, key=lambda row: sequence_order(row.get("scenarioId"))):
        if scenario_kind(rev) != "revision" or rev.get("publishedAt"):
            continue
        if str(rev.get("scenarioId")) not in sent_ids:
            continue
        original = by_id.get(str(rev["revisionOf"]))
        if not original or scenario_kind(original) != "own" or is_deleted(original):
            continue
        if parse_identity(rev.get("createdBy")) != parse_identity(original.get("createdBy")):
            continue
        content = {
            k: v
            for k, v in rev.items()
            if k not in PUBLISH_KEPT_FIELDS and k not in NEVER_STORED_FIELDS
        }
        plan.append((rev, original, {**original, **content}))
    return plan


def clean_scenario_input(body):
    """A POST body as it may be stored: response-only fields, publishedAt and
    the deleted mark dropped (only the lazy publish / DELETE set them),
    createdBy lower-cased, copyOf/revisionOf as plain ids, a presigned cover
    URL back to its key. A copy never keeps the copied row's own id (an older
    editor sent it along): the API names that copy instead."""
    item = {
        k: v
        for k, v in body.items()
        if k not in NEVER_STORED_FIELDS and k != "publishedAt" and k not in DELETE_MARK_FIELDS
    }
    author = parse_identity(item.pop("createdBy", None))
    if author:
        item["createdBy"] = author
    for attr in ("copyOf", "revisionOf"):
        ref = item.pop(attr, None)
        ref = "" if ref is None else str(ref).strip()
        if ref:
            item[attr] = ref
    if item.get("copyOf") and str(item.get("scenarioId") or "").strip() == item["copyOf"]:
        del item["scenarioId"]
    if "CoverImageID" in item:
        item["CoverImageID"] = cover_key_from_url(item["CoverImageID"])
    return item


def scenario_update(existing, body):
    """The row a PUT stores: the body merged over the existing row, minus
    actor, response-only annotations and the fields that fix ownership."""
    updates = {
        k: v
        for k, v in body.items()
        if k not in NEVER_STORED_FIELDS and k not in PUT_LOCKED_FIELDS
    }
    if "CoverImageID" in updates:
        updates["CoverImageID"] = cover_key_from_url(updates["CoverImageID"])
    return {**existing, **updates}


def create_refusal(item, rows, referenced_ids, sent_ids):
    """Why a POST of `item` (already cleaned) can't go ahead, as an error
    response, or None."""
    copy_of, revision_of = item.get("copyOf"), item.get("revisionOf")
    if copy_of and revision_of:
        return err(400, "A scenario can be a copy or a revision, not both")
    if not revision_of:
        # A typed id (a new scenario's, or the one the editor gave a copy) that
        # an old campaign used would inherit its history (see
        # next_scenario_id). A revision's id is the API's, so it never gets here.
        if str(item.get("scenarioId") or "") in referenced_ids:
            return err(409, "That scenario ID was used by an earlier campaign; choose another")
        if not copy_of:
            return None
    author = item.get("createdBy")
    if not author:
        return err(400, "createdBy is required for a copy or a revision")
    target_id = copy_of or revision_of
    target = next(
        (r for r in rows if str(r.get("scenarioId")) == target_id and not is_deleted(r)), None
    )
    shared = bool(target) and is_shared(target, sent_ids)
    owner = parse_identity((target or {}).get("createdBy"))
    if copy_of:
        if not target or not (
            scenario_kind(target) == "template" or (shared and owner != author)
        ):
            return err(400, "copyOf must be a template or someone else's shared scenario")
        # Each edit of a template is a version of its own: no limit per person.
        return None
    if not shared or owner != author:
        return err(400, "revisionOf must be one of your own shared scenarios")
    # One pending revision per scenario and person. A revision a SENT campaign
    # used is published by the next list even if not stamped yet, so it
    # doesn't block the next one.
    existing = next(
        (
            r
            for r in rows
            if scenario_kind(r) == "revision"
            and str(r.get("revisionOf")) == target_id
            and parse_identity(r.get("createdBy")) == author
            and not r.get("publishedAt")
            and str(r.get("scenarioId")) not in sent_ids
        ),
        None,
    )
    if existing:
        return err(
            409,
            f"You already have a pending revision of {target_id}",
            existingId=existing.get("scenarioId"),
        )
    return None


def modify_refusal(row, actor, sent_ids, action):
    """Why `actor` can't PUT (action "edit") or DELETE ("delete") this row, as
    an error response, or None when they can. A copy a SENT campaign used, or
    a private scenario an unsent campaign uses, may still be deleted: campaigns
    keep their own copy of the content, and next_scenario_id / create_refusal
    never hand the id out again. The owner may delete a shared scenario too
    (see deleted_scenario): others can no longer pick it, and the campaigns
    already sent keep their own copy."""
    actor = parse_identity(actor)
    if not actor:
        return err(400, "actor is required")
    if is_deleted(row):
        return err(404, "Scenario not found")
    kind = scenario_kind(row)
    if kind == "template":
        if action == "edit":
            return err(403, "Templates can't be edited. Make a copy instead.")
        return err(403, "Templates can't be deleted")
    if parse_identity(row.get("createdBy")) != actor:
        return err(403, f"Only the scenario's creator can {action} it")
    # A revision a SENT campaign used is published (or about to be by the next
    # list): it backs the original's content and the campaign's history.
    if kind == "revision" and (row.get("publishedAt") or str(row.get("scenarioId")) in sent_ids):
        return err(409, "Published revisions are kept for campaign history")
    if action == "edit" and is_shared(row, sent_ids):
        return err(
            409,
            "This scenario is shared (a sent campaign used it), so editing it "
            "creates a revision instead",
        )
    return None


def deleted_scenario(row, actor, now):
    """The row a DELETE of a shared scenario stores: marked deleted, not
    removed, so the campaigns that used it still resolve its id."""
    return {**row, "deletedAt": now, "deletedBy": parse_identity(actor)}


def revisions_to_discard(rows, scenario_id, sent_ids):
    """When a shared scenario is deleted, its owner's pending revisions go with
    it. A revision a SENT campaign used stays (campaign history); it is hidden
    with the original and never published onto it."""
    return [
        r
        for r in rows
        if scenario_kind(r) == "revision"
        and str(r["revisionOf"]) == str(scenario_id)
        and not r.get("publishedAt")
        and str(r.get("scenarioId")) not in sent_ids
    ]


def load_campaign_refs():
    """One projected scan of the campaigns table: (referenced, sent) ids."""
    return campaign_scenario_refs(
        scan_all(
            "campaigns",
            ProjectionExpression="#s, CampaignStatus, scenarioId, ScenarioID",
            ExpressionAttributeNames={"#s": "status"},
        )
    )


def publish_revisions(rows, sent_ids, context=None):
    """Lazy publish (see publishable_revisions): write each sent revision's
    content onto its original, then stamp the revision with publishedAt.
    Idempotent -- a stamped revision is never picked again -- and best effort:
    a failed write leaves the revision pending for the next list rather than
    failing this one. Returns the rows as they now stand."""
    plan = publishable_revisions(rows, sent_ids)
    if not plan:
        return rows
    tbl = table("scenarios")
    changed = {}
    for revision, original, merged in plan:
        rev_id, orig_id = revision["scenarioId"], original["scenarioId"]
        try:
            # Only onto the original as read: still there, same owner.
            tbl.put_item(
                Item=merged,
                ConditionExpression=(
                    "attribute_exists(scenarioId) AND createdBy = :by AND attribute_not_exists(deletedAt)"
                ),
                ExpressionAttributeValues={":by": original["createdBy"]},
            )
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            log(context, "Revision publish skipped", revisionId=rev_id, scenarioId=orig_id, code=code)
            continue
        changed[str(orig_id)] = merged
        published_at = datetime.now(UTC).isoformat()
        try:
            # Stamped last, so a failure in between just republishes next time.
            tbl.update_item(
                Key={"scenarioId": rev_id},
                UpdateExpression="SET publishedAt = :at",
                ConditionExpression="attribute_exists(scenarioId) AND attribute_not_exists(publishedAt)",
                ExpressionAttributeValues={":at": published_at},
            )
        except ClientError as e:
            # A conditional failure means another request stamped it first:
            # published either way. Anything else retries on the next list.
            if not conditional_failed(e):
                code = e.response.get("Error", {}).get("Code")
                log(context, "Revision stamp failed", revisionId=rev_id, scenarioId=orig_id, code=code)
                continue
        changed[str(rev_id)] = {**revision, "publishedAt": published_at}
        log(context, "Scenario revision published", revisionId=rev_id, scenarioId=orig_id)
    return [changed.get(str(row.get("scenarioId")), row) for row in rows]


# --- scenario drafts ------------------------------------------------------
#
# The scenario editor's autosave: each person's unpublished scenarios, kept on
# the server so a draft follows them to any browser. One row per
# (owner, draftId). The form is stored zlib-compressed in `body` (its HTML
# shrinks several-fold), so a save costs a few write units on the table's small
# provisioned capacity; `summary` (what the Drafts tab shows) is a JSON string
# the list returns without the form. `rev` counts saves: a save names the rev
# it started from and is refused (409) once the row has moved on, so two windows
# on one draft never silently overwrite each other.
#
# `owner` is client-asserted, like `viewer` and `actor` above, until sign-in
# exists: it keeps honest users apart but is not a security boundary.

DRAFT_ROUTES = frozenset(
    {
        "GET /scenario-drafts",
        "GET /scenario-drafts/{id}",
        "PUT /scenario-drafts/{id}",
        "DELETE /scenario-drafts/{id}",
    }
)
# The editor's ids: "SD-" + base36 time + random, or the fixed "SD-saved-before".
DRAFT_ID_RE = re.compile(r"SD-[A-Za-z0-9_-]{1,64}")
DRAFT_VERSION = 1
DRAFT_LAST_STEP = 3  # the editor's four steps, 0-3
# Before compression. Well past any real form; bounds the work one request can ask for.
MAX_DRAFT_FORM_BYTES = 4 * 1024 * 1024
# The Drafts card: names, the step, a small cover picture. Every list returns it.
MAX_DRAFT_SUMMARY_BYTES = 48 * 1024
MAX_SAVE_ID_LENGTH = 64
MAX_SAVED_AT_LENGTH = 40
THROTTLED_CODES = frozenset(
    {"ProvisionedThroughputExceededException", "ThrottlingException", "RequestLimitExceeded"}
)
# What the Drafts list returns of each row: everything but the form and the owner.
DRAFT_LISTING_ATTRS = ("draftId", "rev", "savedAt", "updatedAt", "version", "activeTab", "summary")
DRAFT_VERSION_ATTRS = ("rev", "savedAt", "updatedAt", "saveId")

_drafts_dynamodb = None


def drafts_table():
    """The drafts table, through a client that gives up quickly when DynamoDB
    throttles (the table runs on a small provisioned capacity): the browser
    keeps its copy and saves again later, which beats retrying into the Lambda
    timeout. Built on first use, so no other route pays for it."""
    global _drafts_dynamodb
    if _drafts_dynamodb is None:
        _drafts_dynamodb = boto3.resource(
            "dynamodb", config=Config(retries={"mode": "standard", "max_attempts": 2})
        )
    return _drafts_dynamodb.Table(f"{TABLE_PREFIX}-scenario-drafts")


def projection(attrs):
    """ProjectionExpression kwargs for `attrs`, every name aliased (several,
    like `owner`, are DynamoDB reserved words)."""
    names = {f"#a{i}": attr for i, attr in enumerate(attrs)}
    return {"ProjectionExpression": ", ".join(names), "ExpressionAttributeNames": names}


def compact_json(value):
    return json.dumps(value, cls=DecimalEncoder, separators=(",", ":"), ensure_ascii=False)


def is_draft_id(value):
    return isinstance(value, str) and DRAFT_ID_RE.fullmatch(value) is not None


def draft_step(value):
    """The editor step a draft was on, kept within the editor's four steps."""
    if isinstance(value, bool):
        return 0
    try:
        step = int(value)
    except (TypeError, ValueError, OverflowError):
        return 0
    return min(max(step, 0), DRAFT_LAST_STEP)


def draft_form_bytes(form_data, edit):
    """A draft's form and edit as stored before compression: compact JSON."""
    return compact_json({"formData": form_data, "edit": edit}).encode("utf-8")


def pack_draft_form(raw):
    """The stored `body`: draft_form_bytes, zlib-compressed."""
    return zlib.compress(raw, 6)


def unpack_draft_form(stored):
    """A stored `body` back into {formData, edit}. boto3 returns binary
    attributes wrapped in a Binary, whose bytes are in `.value`."""
    if stored is None:
        return {"formData": {}, "edit": None}
    data = json.loads(zlib.decompress(bytes(getattr(stored, "value", stored))).decode("utf-8"))
    return {"formData": data.get("formData") or {}, "edit": data.get("edit")}


def draft_summary_json(summary):
    """The Drafts-card summary as stored, a JSON string; its cover picture is
    dropped if that is what makes it too large. None when still too large."""
    summary = dict(summary)
    text = compact_json(summary)
    if len(text.encode("utf-8")) > MAX_DRAFT_SUMMARY_BYTES:
        summary.pop("cover", None)
        text = compact_json(summary)
    return text if len(text.encode("utf-8")) <= MAX_DRAFT_SUMMARY_BYTES else None


def parse_draft_save(body):
    """A PUT /scenario-drafts/{id} body, checked: (fields, None) or (None, problem)."""
    if not isinstance(body, dict):
        return None, "Body must be a JSON object"
    owner = parse_identity(body.get("owner"))
    if not owner:
        return None, "owner is required"
    base_rev = body.get("baseRev", 0)
    if isinstance(base_rev, bool) or not isinstance(base_rev, int) or base_rev < 0:
        return None, "baseRev must be a whole number, 0 or more"
    save_id = body.get("saveId") or ""
    if not isinstance(save_id, str) or len(save_id) > MAX_SAVE_ID_LENGTH:
        return None, f"saveId must be text of at most {MAX_SAVE_ID_LENGTH} characters"
    draft = body.get("draft")
    if not isinstance(draft, dict):
        return None, "draft is required"
    version = draft.get("version")
    if isinstance(version, bool) or version != DRAFT_VERSION:
        return None, f"draft.version must be {DRAFT_VERSION}"
    form_data = draft.get("formData")
    if not isinstance(form_data, dict):
        return None, "draft.formData must be an object"
    edit = draft.get("edit")
    if edit is not None and not isinstance(edit, dict):
        return None, "draft.edit must be an object"
    summary = body.get("summary")
    if summary is None:
        summary = {}
    if not isinstance(summary, dict):
        return None, "summary must be an object"
    saved_at = draft.get("savedAt")
    if not isinstance(saved_at, str) or len(saved_at) > MAX_SAVED_AT_LENGTH:
        saved_at = ""
    return {
        "owner": owner,
        "baseRev": base_rev,
        "saveId": save_id,
        "savedAt": saved_at,
        "activeTab": draft_step(draft.get("activeTab")),
        "formData": form_data,
        "edit": edit,
        "summary": summary,
    }, None


def draft_listing(row):
    """What the Drafts list shows of a stored row: never the form."""
    try:
        summary = json.loads(row.get("summary") or "{}")
    except (TypeError, ValueError):
        summary = {}
    return {
        "draftId": row.get("draftId"),
        "rev": row.get("rev", 0),
        "savedAt": row.get("savedAt", ""),
        "updatedAt": row.get("updatedAt", ""),
        "version": row.get("version", DRAFT_VERSION),
        "activeTab": draft_step(row.get("activeTab")),
        "summary": summary if isinstance(summary, dict) else {},
    }


def draft_version_info(row):
    """Which save a row holds (a 409 tells the client), or None for no row."""
    if not row:
        return None
    return {attr: row.get(attr, 0 if attr == "rev" else "") for attr in DRAFT_VERSION_ATTRS}


def newest_drafts_first(listings):
    return sorted(
        listings,
        key=lambda d: (str(d.get("savedAt") or ""), str(d.get("updatedAt") or "")),
        reverse=True,
    )


def save_scenario_draft(draft_id, body, context):
    fields, problem = parse_draft_save(body)
    if problem:
        return err(400, problem)
    summary = draft_summary_json(fields["summary"])
    if summary is None:
        return err(400, f"summary is too large (limit {MAX_DRAFT_SUMMARY_BYTES // 1024} KB)")
    raw = draft_form_bytes(fields["formData"], fields["edit"])
    if len(raw) > MAX_DRAFT_FORM_BYTES:
        log(context, "Scenario draft too large", draftId=draft_id, bytes=len(raw))
        return size_error(len(raw))
    packed = pack_draft_form(raw)

    now = datetime.now(UTC).isoformat()
    base_rev = fields["baseRev"]
    item = {
        "owner": fields["owner"],
        "draftId": draft_id,
        "rev": base_rev + 1,
        "saveId": fields["saveId"],
        "savedAt": fields["savedAt"] or now,
        "updatedAt": now,
        "version": DRAFT_VERSION,
        "activeTab": fields["activeTab"],
        "summary": summary,
    }
    size = len(compact_json(item).encode("utf-8")) + len(packed)
    if size > MAX_ITEM_BYTES:
        log(context, "Scenario draft too large", draftId=draft_id, bytes=size)
        return size_error(size)
    item["body"] = packed

    if base_rev == 0:
        condition = {"ConditionExpression": "attribute_not_exists(draftId)"}
    else:
        condition = {
            "ConditionExpression": "#rev = :base",
            "ExpressionAttributeNames": {"#rev": "rev"},
            "ExpressionAttributeValues": {":base": base_rev},
        }
    tbl = drafts_table()
    try:
        tbl.put_item(Item=item, **condition)
    except ClientError as e:
        if not conditional_failed(e):
            raise
        current = tbl.get_item(
            Key={"owner": fields["owner"], "draftId": draft_id},
            ConsistentRead=True,
            **projection(DRAFT_VERSION_ATTRS),
        ).get("Item")
        log(
            context,
            "Scenario draft save conflict",
            draftId=draft_id,
            baseRev=base_rev,
            currentRev=int(current.get("rev", 0)) if current else None,
        )
        return err(
            409,
            "This draft was changed somewhere else since this save began",
            code="DRAFT_CONFLICT",
            current=draft_version_info(current),
        )
    return ok({key: item[key] for key in ("draftId", "rev", "savedAt", "updatedAt", "saveId")})


def scenario_drafts(route, event, params, context):
    """GET (list / one), PUT and DELETE /scenario-drafts; see the notes above."""
    try:
        if route == "PUT /scenario-drafts/{id}":
            draft_id = params.get("id", "")
            if not is_draft_id(draft_id):
                return err(400, "Not a draft id")
            try:
                body = parse_body(event)
            except ValueError:
                return err(400, "Body must be valid JSON")
            return save_scenario_draft(draft_id, body, context)

        owner = parse_identity((event.get("queryStringParameters") or {}).get("owner"))
        if not owner:
            return err(400, "owner is required")

        if route == "GET /scenario-drafts":
            tbl = drafts_table()
            rows = []
            kwargs = {
                "KeyConditionExpression": Key("owner").eq(owner),
                "ConsistentRead": True,
                **projection(DRAFT_LISTING_ATTRS),
            }
            while True:
                resp = tbl.query(**kwargs)
                rows.extend(resp.get("Items", []))
                if not resp.get("LastEvaluatedKey"):
                    break
                kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
            listings = newest_drafts_first([draft_listing(row) for row in rows])
            return ok(listings, count=len(listings))

        draft_id = params.get("id", "")
        if not is_draft_id(draft_id):
            return err(400, "Not a draft id")
        key = {"owner": owner, "draftId": draft_id}

        if route == "GET /scenario-drafts/{id}":
            row = drafts_table().get_item(Key=key, ConsistentRead=True).get("Item")
            if not row:
                return err(404, "Draft not found")
            return ok({**draft_listing(row), **unpack_draft_form(row.get("body"))})

        # DELETE: done whether or not there was a row, so a retried delete is fine.
        drafts_table().delete_item(Key=key)
        return respond(204, {"data": None})

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code not in THROTTLED_CODES:
            raise
        log(context, "Scenario drafts throttled", route=route, code=code)
        return err(
            503,
            "Drafts are busy right now; your work is kept in this browser and saved shortly",
            code="BUSY",
        )


# routeKey -> table name for simple "list all" GETs
LIST_ROUTES = {
    "GET /sender-identities": "sender-identities",
    "GET /users": "users",
    "GET /landing-pages": "landing-pages",
    "GET /user-lists": "user-lists",
    "GET /gamification-rules": "gamification-rules",
    "GET /training/paths": "training-paths",
    "GET /training/videos": "training-videos",
    "GET /training/quizzes": "training-quizzes",
    "GET /training/certificates": "training-certificates",
    "GET /campaigns-catalog": "campaigns-catalog",
}

# routeKey -> (table, key-attribute) for "get by id" GETs
GET_BY_ID = {
    "GET /sender-identities/{id}": ("sender-identities", "id"),
    "GET /users/{id}": ("users", "UserID"),
    "GET /scenarios/{id}": ("scenarios", "scenarioId"),
    "GET /landing-pages/{id}": ("landing-pages", "LandingPageID"),
}


def lambda_handler(event, context):
    route = event.get("routeKey", "")
    params = event.get("pathParameters") or {}

    try:
        if route in DRAFT_ROUTES:
            return scenario_drafts(route, event, params, context)

        if route == "GET /scenarios":
            items = scan_all("scenarios")
            # Without a viewer every row comes back as before (older clients),
            # except deleted shared scenarios, which no list shows.
            viewer = parse_identity((event.get("queryStringParameters") or {}).get("viewer"))
            if viewer:
                _, sent_ids = load_campaign_refs()
                items = publish_revisions(items, sent_ids, context)
                items = visible_scenarios(items, sent_ids, viewer)
            else:
                items = [i for i in items if not is_deleted(i)]
            items = [sign_cover(i) for i in items]
            return ok(items, count=len(items))

        if route in LIST_ROUTES:
            items = scan_all(LIST_ROUTES[route])
            return ok(items, count=len(items))

        if route in GET_BY_ID:
            name, key_attr = GET_BY_ID[route]
            item = get_one(name, {key_attr: params["id"]})
            if not item:
                return err(404, "Not found")
            return ok(sign_cover(item) if name == "scenarios" else item)

        if route == "GET /user-lists/{id}/members":
            resp = table("user-list-members").query(
                KeyConditionExpression=Key("userListId").eq(params["id"])
            )
            members = resp.get("Items", [])
            return ok(members, count=len(members))

        # --- sender-identities CRUD (first wired screen) ---
        if route == "POST /sender-identities":
            body = parse_body(event)
            if not body.get("email"):
                return err(400, "email is required")
            item = dict(body)
            item.setdefault("id", f"em-{uuid.uuid4().hex[:8]}")
            item.setdefault("status", "Active")
            item.setdefault("usageCount", 0)
            item.setdefault(
                "createdDate", datetime.now(UTC).strftime("%d %b %Y")
            )
            table("sender-identities").put_item(Item=item)
            return respond(201, {"data": item})

        if route == "PUT /sender-identities/{id}":
            body = parse_body(event)
            existing = get_one("sender-identities", {"id": params["id"]})
            if not existing:
                return err(404, "Not found")
            merged = {**existing, **body, "id": params["id"]}
            table("sender-identities").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /sender-identities/{id}":
            table("sender-identities").delete_item(Key={"id": params["id"]})
            return respond(204, {"data": None})

        # --- gamification rules (Gamification Engine screen) ---
        if route == "PUT /gamification-rules/{id}":
            body = parse_body(event)
            points, problem = parse_points(body.get("PointsAssigned"))
            if problem:
                return err(400, problem)
            now = datetime.now(UTC)
            try:
                # Only the six seeded rules exist; an unknown name must not
                # quietly create a seventh.
                resp = table("gamification-rules").update_item(
                    Key={"EventOperation": params["id"]},
                    UpdateExpression=(
                        "SET PointsAssigned = :points, ModifiedBy = :by, LastModifiedOn = :on"
                    ),
                    ConditionExpression="attribute_exists(EventOperation)",
                    ExpressionAttributeValues={
                        ":points": points,
                        ":by": str(body.get("ModifiedBy") or "unknown"),
                        ":on": f"{now.day}-{now.strftime('%b-%y')}",
                    },
                    ReturnValues="ALL_NEW",
                )
            except ClientError as e:
                if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                    return err(404, f"No gamification rule named {params['id']}")
                raise
            return ok(resp["Attributes"])

        # --- landing-pages CRUD (catalogue screen) ---
        if route == "POST /landing-pages":
            body = parse_body(event)
            if not body.get("LandingPageName"):
                return err(400, "LandingPageName is required")
            item = dict(body)
            if not item.get("LandingPageID"):
                # Continue the LP-00N sequence the catalogue already uses.
                item["LandingPageID"] = next_sequence_id(
                    scan_all("landing-pages"), "LandingPageID", "LP"
                )
            item.setdefault(
                "CreatedDate", datetime.now(UTC).strftime("%d/%m/%Y %I:%M %p")
            )
            item.setdefault("LandingPageDescription", "")
            item.setdefault("LandingPageContent", "")
            table("landing-pages").put_item(Item=item)
            return respond(201, {"data": item})

        if route == "PUT /landing-pages/{id}":
            body = parse_body(event)
            existing = get_one("landing-pages", {"LandingPageID": params["id"]})
            if not existing:
                return err(404, "Landing page not found")
            merged = {**existing, **body, "LandingPageID": params["id"]}
            table("landing-pages").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /landing-pages/{id}":
            table("landing-pages").delete_item(Key={"LandingPageID": params["id"]})
            return respond(204, {"data": None})

        # --- scenarios CRUD (authoring wizard) ---
        if route == "POST /scenarios":
            body = parse_body(event)
            if not body.get("scenarioName"):
                return err(400, "scenarioName is required")
            item = clean_scenario_input(body)
            now = datetime.now(UTC)
            created_on = f"{now.day}-{now.strftime('%b-%y')}"
            rows = scan_all("scenarios")
            referenced, sent_ids = load_campaign_refs()
            refusal = create_refusal(item, rows, referenced, sent_ids)
            if refusal:
                return refusal
            if item.get("revisionOf"):
                # A revision is a new row the API names itself: an id or date
                # carried over from the row it was made from must not stick.
                item["scenarioId"] = next_scenario_id(rows, referenced)
                item["CreatedOn"] = created_on
            elif item.get("copyOf"):
                # A copy keeps the id its editor showed (checked above, and
                # the write below refuses one that is taken); without one,
                # the API names it. Never the copied row's date.
                if not item.get("scenarioId"):
                    item["scenarioId"] = next_scenario_id(rows, referenced)
                item["CreatedOn"] = created_on
            elif not item.get("scenarioId"):
                # The wizard's first step asks the author to type an id, so the
                # SC-00N sequence is only a fallback for when one wasn't supplied.
                item["scenarioId"] = next_scenario_id(rows, referenced)
            item.setdefault("CreatedOn", created_on)
            for field in (
                "description",
                "emailBody",
                "CoverImageID",
                "landingPageId",
                "trainingId",
            ):
                item.setdefault(field, "")
            oversize = too_large(item)
            if oversize:
                return size_error(oversize)
            try:
                table("scenarios").put_item(
                    Item=item,
                    ConditionExpression="attribute_not_exists(scenarioId)",
                )
            except ClientError as e:
                # Caught here on purpose: the outer handler would flatten this
                # into a generic 500 and the author would never learn the id is
                # taken. Unlike landing-pages, the id is user-typed, so a plain
                # put_item would silently overwrite someone else's scenario.
                if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                    return err(409, f"Scenario {item['scenarioId']} already exists")
                raise
            return respond(201, {"data": item})

        if route == "PUT /scenarios/{id}":
            body = parse_body(event)
            existing = get_one("scenarios", {"scenarioId": params["id"]})
            if not existing:
                return err(404, "Scenario not found")
            _, sent_ids = load_campaign_refs()
            refusal = modify_refusal(existing, body.get("actor"), sent_ids, "edit")
            if refusal:
                return refusal
            merged = scenario_update(existing, body)
            oversize = too_large(merged)
            if oversize:
                return size_error(oversize)
            try:
                # Not onto a row deleted or published since it was read.
                table("scenarios").put_item(
                    Item=merged,
                    ConditionExpression="attribute_exists(scenarioId) AND attribute_not_exists(publishedAt)",
                )
            except ClientError as e:
                if conditional_failed(e):
                    return err(409, "Scenario changed while saving. Reload and try again.")
                raise
            return ok(merged)

        if route == "DELETE /scenarios/{id}":
            existing = get_one("scenarios", {"scenarioId": params["id"]})
            if not existing or is_deleted(existing):
                # Already gone. Covers under this id are left alone: they may
                # belong to a scenario still being authored (or, for a deleted
                # shared one, to the campaigns that used it).
                return respond(204, {"data": None})
            actor = (event.get("queryStringParameters") or {}).get("actor")
            _, sent_ids = load_campaign_refs()
            refusal = modify_refusal(existing, actor, sent_ids, "delete")
            if refusal:
                return refusal
            if is_shared(existing, sent_ids):
                # Others may have used it: mark it deleted instead of removing
                # it, so campaign references still resolve. Its cover stays for
                # the same reason; its pending revisions go with it.
                marked = deleted_scenario(existing, actor, datetime.now(UTC).isoformat())
                try:
                    table("scenarios").put_item(
                        Item=marked,
                        ConditionExpression="attribute_exists(scenarioId) AND attribute_not_exists(deletedAt)",
                    )
                except ClientError as e:
                    if conditional_failed(e):
                        return respond(204, {"data": None})
                    raise
                for rev in revisions_to_discard(scan_all("scenarios"), params["id"], sent_ids):
                    try:
                        table("scenarios").delete_item(
                            Key={"scenarioId": rev["scenarioId"]},
                            ConditionExpression="attribute_not_exists(publishedAt)",
                        )
                    except ClientError as e:
                        if not conditional_failed(e):
                            raise
                log(context, "scenario.deleted_shared", scenarioId=params["id"])
                return respond(204, {"data": None})
            try:
                table("scenarios").delete_item(
                    Key={"scenarioId": params["id"]},
                    ConditionExpression="attribute_not_exists(publishedAt)",
                )
            except ClientError as e:
                if conditional_failed(e):
                    return err(409, "Published revisions are kept for campaign history")
                raise
            if UPLOAD_BUCKET:
                delete_s3_prefix(
                    UPLOAD_BUCKET,
                    f"uploads/scenario-covers/{safe_name(params['id'])}/",
                )
            return respond(204, {"data": None})

        # Presign a cover upload. No DynamoDB row is written here -- the POST or
        # PUT that follows persists the returned key on the scenario itself.
        if route == "POST /scenarios/cover-upload":
            if not UPLOAD_BUCKET:
                return err(500, "Upload bucket is not configured")
            body = parse_body(event)
            if not body.get("scenarioId"):
                return err(400, "scenarioId is required")
            if not body.get("fileName"):
                return err(400, "fileName is required")
            content_type = body.get("contentType") or "image/png"
            if content_type not in COVER_CONTENT_TYPES:
                return err(400, f"Unsupported cover image type: {content_type}")
            key = cover_image_key(body["scenarioId"], body["fileName"])
            upload_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": UPLOAD_BUCKET,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=900,
            )
            return respond(
                201, {"data": {"coverImageKey": key, "uploadUrl": upload_url}}
            )

        # --- recipient list bulk upload: create pending list + presigned S3 PUT ---
        if route == "POST /user-lists/bulk-upload":
            if not UPLOAD_BUCKET:
                return err(500, "Upload bucket is not configured")
            body = parse_body(event)
            if not body.get("name"):
                return err(400, "name is required")
            # Reusing an existing listId lets "edit + re-upload" replace a list
            # in place instead of creating a duplicate.
            list_id = body.get("listId") or f"ul-{uuid.uuid4().hex[:8]}"
            raw_name = body.get("fileName") or "recipients.csv"
            s3_key = f"uploads/recipients/{list_id}/{safe_name(raw_name)}"
            now = datetime.now(UTC).isoformat()

            table("user-lists").put_item(
                Item={
                    "userListId": list_id,
                    "id": list_id,
                    "name": body["name"],
                    "description": body.get("description", ""),
                    "type": "Bulk Upload",
                    "listType": "SAVED",
                    "status": "UPLOADING",
                    "s3Key": s3_key,
                    "s3Bucket": UPLOAD_BUCKET,
                    "totalUsers": 0,
                    "createdDate": now,
                }
            )
            upload_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": UPLOAD_BUCKET,
                    "Key": s3_key,
                    "ContentType": "text/csv",
                },
                ExpiresIn=900,
            )
            return respond(
                201,
                {"data": {"listId": list_id, "s3Key": s3_key, "uploadUrl": upload_url}},
            )

        # --- trigger ingest after the browser has PUT the file to S3 ---
        if route == "POST /user-lists/{id}/ingest":
            if not INGEST_FUNCTION:
                return err(500, "Ingest function is not configured")
            lst = get_one("user-lists", {"userListId": params["id"]})
            if not lst:
                return err(404, "List not found")
            key, bucket = lst.get("s3Key"), lst.get("s3Bucket")
            if not key or not bucket:
                return err(400, "List has no uploaded file yet")
            payload = {"Records": [{"s3": {"bucket": {"name": bucket}, "object": {"key": key}}}]}
            lambda_client.invoke(
                FunctionName=INGEST_FUNCTION,
                InvocationType="RequestResponse",
                Payload=json.dumps(payload).encode("utf-8"),
            )
            updated = get_one("user-lists", {"userListId": params["id"]})
            return ok(updated)

        if route == "PUT /user-lists/{id}":
            body = parse_body(event)
            existing = get_one("user-lists", {"userListId": params["id"]})
            if not existing:
                return err(404, "List not found")
            merged = {**existing, **body, "userListId": params["id"]}
            table("user-lists").put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /user-lists/{id}":
            list_id = params["id"]
            existing = get_one("user-lists", {"userListId": list_id})
            # Remove the cached member rows.
            members_tbl = table("user-list-members")
            resp = members_tbl.query(
                KeyConditionExpression=Key("userListId").eq(list_id)
            )
            with members_tbl.batch_writer() as batch:
                for m in resp.get("Items", []):
                    batch.delete_item(Key={"userListId": list_id, "email": m["email"]})
            # Remove EVERY uploaded file for this list (re-uploads leave earlier
            # versions behind), so no recipient PII is orphaned in S3.
            bucket = (existing or {}).get("s3Bucket") or UPLOAD_BUCKET
            if bucket:
                delete_s3_prefix(bucket, f"uploads/recipients/{list_id}/")
            table("user-lists").delete_item(Key={"userListId": list_id})
            return respond(204, {"data": None})

        return err(404, f"No handler for route: {route}")

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "AWSClientError")
        print(
            json.dumps(
                {
                    "message": "AWS error",
                    "code": code,
                    "route": route,
                    "operation": e.operation_name,
                    "detail": e.response.get("Error", {}).get("Message", "")[:400],
                }
            )
        )
        return err(500, "A backend error occurred")
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"message": "Unhandled error", "type": type(e).__name__, "route": route}))
        return err(500, "An unexpected error occurred")
