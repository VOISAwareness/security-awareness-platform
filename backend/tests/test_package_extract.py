"""Tests for package-extract (moto's in-memory S3 and DynamoDB; no AWS)."""
import importlib.util
import io
import os
import zipfile
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

MODULE_PATH = Path(__file__).resolve().parents[1] / "package-extract" / "lambda_function.py"
REGION = "ap-south-1"
UPLOAD = "a" * 32
KEY = f"uploads/training-packages/{UPLOAD}/course.zip"
PREFIX = f"training-content/{UPLOAD}/"

MANIFEST_12 = """<?xml version="1.0"?>
<manifest identifier="m" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org1">
    <organization identifier="org1"><title>Course</title>
      <item identifier="i1" identifierref="r1" parameters="?lang=en"><title>Lesson</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="r0" type="webcontent" adlcp:scormtype="asset" href="shared/readme.html"/>
    <resource identifier="r1" type="webcontent" adlcp:scormtype="sco" href="index_lms.html"/>
  </resources>
</manifest>"""

MANIFEST_2004 = """<?xml version="1.0"?>
<manifest identifier="m" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3" xmlns:xml="http://www.w3.org/XML/1998/namespace">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 4th Edition</schemaversion></metadata>
  <organizations default="b">
    <organization identifier="a"><item identifier="x" identifierref="ra"/></organization>
    <organization identifier="b"><item identifier="y"><item identifier="z" identifierref="rb"/></item></organization>
  </organizations>
  <resources xml:base="content/">
    <resource identifier="ra" adlcp:scormType="sco" href="a.html"/>
    <resource identifier="rb" adlcp:scormType="sco" xml:base="b/" href="start.html"/>
  </resources>
</manifest>"""


def make_zip(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, body in files.items():
            zf.writestr(name, body)
    return buf.getvalue()


@pytest.fixture
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("UPLOAD_BUCKET", "assets")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("package_extract", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def aws(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        s3 = boto3.client("s3", region_name=REGION)
        s3.create_bucket(Bucket="assets", CreateBucketConfiguration={"LocationConstraint": REGION})
        db = boto3.resource("dynamodb", region_name=REGION)
        tbl = db.create_table(
            TableName="t-training-packages",
            KeySchema=[{"AttributeName": "PackageID", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "PackageID", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        monkeypatch.setattr(mod, "s3", s3)
        monkeypatch.setattr(mod, "dynamodb", db)
        monkeypatch.setattr(mod, "UPLOAD_BUCKET", "assets")
        monkeypatch.setattr(mod, "TABLE_PREFIX", "t")
        yield s3, tbl


def put_package(aws, files, pid="SP-001", key=KEY):
    s3, tbl = aws
    body = files if isinstance(files, bytes) else make_zip(files)
    s3.put_object(Bucket="assets", Key=key, Body=body)
    tbl.put_item(Item={"PackageID": pid, "PackageName": "Course", "PackageKey": key, "ContentStatus": "PENDING"})


def content(aws):
    s3, _ = aws
    return {o["Key"][len(PREFIX):] for o in s3.list_objects_v2(Bucket="assets", Prefix=PREFIX).get("Contents", [])}


def row(aws, pid="SP-001"):
    return aws[1].get_item(Key={"PackageID": pid}).get("Item")


def test_safe_paths(mod):
    assert mod.safe_path("course/./js/app.js") == "course/js/app.js"
    assert mod.safe_path("win\\style.css") == "win/style.css"
    for bad in ("../evil.html", "a/../../b", "/etc/passwd", "C:/x.html", "", "a/\x00b"):
        assert mod.safe_path(bad) is None, bad


def test_content_types(mod):
    assert mod.content_type("index.html").startswith("text/html")
    assert mod.content_type("a/b.JS").startswith("text/javascript")
    assert mod.content_type("f.woff2") == "font/woff2"
    assert mod.content_type("noext") == "application/octet-stream"


def test_scorm_12_in_a_folder(mod, aws):
    put_package(aws, {
        "Course/imsmanifest.xml": MANIFEST_12,
        "Course/index_lms.html": "<html>lms</html>",
        "Course/shared/readme.html": "<html>readme</html>",
        "Course/js/app.js": "var a = 1;",
        "__MACOSX/Course/._index_lms.html": "junk",
        "Course/.DS_Store": "junk",
    })
    out = mod.extract("SP-001")
    assert out["ContentStatus"] == "READY"
    r = row(aws)
    assert r["ContentStatus"] == "READY" and r["ScormVersion"] == "1.2"
    assert r["LaunchPath"] == "Course/index_lms.html?lang=en"
    assert r["ContentPrefix"] == PREFIX and r["ContentFiles"] == 4
    assert content(aws) == {"Course/imsmanifest.xml", "Course/index_lms.html", "Course/shared/readme.html", "Course/js/app.js"}
    head = aws[0].head_object(Bucket="assets", Key=PREFIX + "Course/js/app.js")
    assert head["ContentType"].startswith("text/javascript")
    got = aws[0].get_object(Bucket="assets", Key=PREFIX + "Course/index_lms.html")["Body"].read()
    assert got == b"<html>lms</html>"


def test_scorm_2004_default_organization_and_xml_base(mod, aws):
    put_package(aws, {"imsmanifest.xml": MANIFEST_2004, "content/a.html": "a", "content/b/start.html": "b"})
    mod.extract("SP-001")
    r = row(aws)
    assert r["ScormVersion"] == "2004" and r["LaunchPath"] == "content/b/start.html"


def test_plain_html5_opens_its_index(mod, aws):
    put_package(aws, {"site/index.html": "<html></html>", "site/deep/index.html": "x", "site/img/a.png": b"\x89PNG"})
    mod.extract("SP-001")
    r = row(aws)
    assert r["ContentStatus"] == "READY" and r["LaunchPath"] == "site/index.html" and "ScormVersion" not in r


@pytest.mark.parametrize(
    "files, says",
    [
        ({"../evil.html": "x", "index.html": "y"}, "unsafe path"),
        ({"readme.txt": "no page"}, "no imsmanifest.xml"),
        ({"imsmanifest.xml": MANIFEST_12}, "not in the zip"),
        ({"imsmanifest.xml": "<manifest"}, "not valid XML"),
        (b"this is not a zip", "not a readable zip"),
    ],
)
def test_unplayable_zips_fail_with_a_reason_and_write_nothing(mod, aws, files, says):
    put_package(aws, files)
    out = mod.extract("SP-001")
    r = row(aws)
    assert out["ContentStatus"] == r["ContentStatus"] == "FAILED"
    assert says in r["ContentError"]
    assert content(aws) == set()


def test_zip_bomb_limits(mod, aws, monkeypatch):
    put_package(aws, {f"f{i}.html": "x" * 100 for i in range(5)})
    monkeypatch.setattr(mod, "MAX_FILES", 3)
    mod.extract("SP-001")
    assert "more than 3 files" in row(aws)["ContentError"]
    monkeypatch.setattr(mod, "MAX_FILES", 100)
    monkeypatch.setattr(mod, "MAX_UNPACKED_BYTES", 250)
    mod.extract("SP-001")
    assert "unpacks to more than" in row(aws)["ContentError"]
    monkeypatch.setattr(mod, "MAX_UNPACKED_BYTES", 10_000)
    mod.extract("SP-001")
    r = row(aws)
    assert r["ContentStatus"] == "READY" and "ContentError" not in r


def test_a_rerun_leaves_no_old_files(mod, aws):
    put_package(aws, {"index.html": "1", "old.js": "x"})
    mod.extract("SP-001")
    put_package(aws, {"index.html": "2"})
    mod.extract("SP-001")
    assert content(aws) == {"index.html"}


def test_a_package_deleted_meanwhile_is_not_brought_back(mod, aws, monkeypatch):
    put_package(aws, {"index.html": "x"})
    real = mod.upload_all

    def upload_then_delete(*args):
        real(*args)
        aws[1].delete_item(Key={"PackageID": "SP-001"})

    monkeypatch.setattr(mod, "upload_all", upload_then_delete)
    assert mod.extract("SP-001") is None
    assert row(aws) is None and content(aws) == set()


def test_nothing_for_a_missing_row_or_a_foreign_key(mod, aws):
    assert mod.extract("SP-404") is None
    put_package(aws, {"index.html": "x"}, key="uploads/recipients/x/list.zip")
    assert mod.extract("SP-001") is None
    assert row(aws)["ContentStatus"] == "PENDING"


def test_handler_checks_its_event(mod, aws):
    assert mod.lambda_handler({}, None) == {"ok": False}
    assert mod.lambda_handler({"packageId": "../x"}, None) == {"ok": False}
    put_package(aws, {"index.html": "x"})
    assert mod.lambda_handler({"packageId": "SP-001"}, None) == {"ok": True, "packageId": "SP-001"}


def test_backfill_picks_unfinished_packages():
    spec = importlib.util.spec_from_file_location(
        "extract_training_packages", MODULE_PATH.parents[1] / "seed-data" / "extract_training_packages.py")
    script = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(script)
    rows = [
        {"PackageID": "SP-003", "PackageKey": "k", "ContentStatus": "READY"},
        {"PackageID": "SP-002", "PackageKey": "k", "ContentStatus": "FAILED"},
        {"PackageID": "SP-001", "PackageKey": "k"},
        {"PackageID": "SP-004"},
    ]
    assert [r["PackageID"] for r in script.to_extract(rows)] == ["SP-001", "SP-002"]
    assert [r["PackageID"] for r in script.to_extract(rows, every=True)] == ["SP-001", "SP-002", "SP-003"]
