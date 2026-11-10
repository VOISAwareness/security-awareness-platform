"""reference-api: the Training screen's paths, videos, quizzes and certificates
(moto's in-memory S3 and DynamoDB; nothing leaves the process)."""
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from moto import mock_aws

MODULE_PATH = Path(__file__).resolve().parents[1] / "reference-api" / "lambda_function.py"
REGION = "ap-south-1"
KINDS = {
    "paths": ("training-paths", "TrainingPathID"),
    "videos": ("training-videos", "TrainingVideoID"),
    "quizzes": ("training-quizzes", "TrainingQuizID"),
    "certificates": ("training-certificates", "TrainingCertificateID"),
}


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("reference_api_training", MODULE_PATH)
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
        for name, key in KINDS.values():
            db.create_table(
                TableName=f"{mod.TABLE_PREFIX}-{name}",
                KeySchema=[{"AttributeName": key, "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": key, "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
        monkeypatch.setattr(mod, "dynamodb", db)
        monkeypatch.setattr(mod, "s3_client", s3)
        monkeypatch.setattr(mod, "UPLOAD_BUCKET", "assets")
        yield SimpleNamespace(s3=s3, db=db)


def call(mod, method, path, body=None, row_id=None):
    event = {
        "routeKey": f"{method} {path}",
        "pathParameters": {"id": row_id} if row_id else None,
        "body": json.dumps(body) if body is not None else None,
    }
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"]) if resp.get("body") else None


def test_every_kind_round_trips_and_deletes(mod, aws):
    rows = {
        "paths": {"TrainingPathName": "Basics", "TrainingVideoAttached": ["TV-1"], "UsedTime": 12, "status": "Published"},
        "videos": {"TrainingVideoName": "Spot it", "TrainingVideo": "/src/assets/TrainingVideo1.mp4"},
        "quizzes": {"TrainingQuizName": "Quiz", "TrainingCompletionThreshold": 80,
                    "QuizData": {"Question01": {"Question": "Q?", "Options": ["a", "b"], "Weight": 1.5}}},
        "certificates": {"TrainingCertificateName": "Cert", "Certificate(html)": "<p>Well done</p>"},
    }
    for kind, row in rows.items():
        id_attr = KINDS[kind][1]
        status, body = call(mod, "PUT", f"/training/{kind}/{{id}}", row, "X-001")
        assert status == 200, body
        assert body["data"][id_attr] == "X-001" and "ModifiedAt" in body["data"]
        status, listed = call(mod, "GET", f"/training/{kind}")
        assert status == 200 and [r[id_attr] for r in listed["data"]] == ["X-001"]
        assert call(mod, "DELETE", f"/training/{kind}/{{id}}", row_id="X-001")[0] == 204
        assert call(mod, "GET", f"/training/{kind}")[1]["data"] == []
        assert call(mod, "DELETE", f"/training/{kind}/{{id}}", row_id="X-001")[0] == 204  # already gone
    quiz_weight = rows["quizzes"]["QuizData"]["Question01"]["Weight"]
    assert quiz_weight == 1.5  # floats are stored (as Decimal) and read back


def test_an_edit_keeps_created_on_and_drops_browser_only_urls(mod, aws):
    call(mod, "PUT", "/training/videos/{id}", {"TrainingVideoName": "A", "CreatedOn": "12-Jan-2026"}, "TV-1")
    status, body = call(mod, "PUT", "/training/videos/{id}",
                        {"TrainingVideoName": " B ", "TrainingVideo": "blob:http://localhost/123"}, "TV-1")
    assert status == 200
    assert body["data"]["TrainingVideoName"] == "B" and body["data"]["CreatedOn"] == "12-Jan-2026"
    assert "TrainingVideo" not in body["data"]


@pytest.mark.parametrize("row_id,body,says", [
    ("TP 1", {"TrainingPathName": "x"}, "letters, digits"),
    ("TP-1", [1], "JSON object"),
    ("TP-1", {"TrainingPathName": "  "}, "is required"),
    ("TP-1", {"TrainingPathName": "x" * 201}, "at most 200"),
    ("TP-1", {"TrainingPathName": "x", "TrainingPathID": "TP-2"}, "must match"),
    ("TP-1", {"TrainingPathName": "x", "Description": "y" * 400_000}, "too large"),
])
def test_what_is_refused(mod, aws, row_id, body, says):
    status, resp = call(mod, "PUT", "/training/paths/{id}", body, row_id)
    assert status == 400 and says in resp["error"]["message"]


def test_a_video_upload_is_checked_signed_and_cleaned_up(mod, aws):
    assert call(mod, "POST", "/training/media/upload", {"fileName": "a.svg", "contentType": "image/svg+xml"})[0] == 400
    assert call(mod, "POST", "/training/media/upload", {"contentType": "video/mp4"})[0] == 400
    status, body = call(mod, "POST", "/training/media/upload", {"fileName": "My Video.mp4", "contentType": "video/mp4"})
    assert status == 201 and "X-Amz-Signature" in body["data"]["uploadUrl"]
    key = body["data"]["mediaKey"]
    assert mod.is_media_key(key) and key.endswith("/My_Video.mp4")

    # no row until the file is there; none for a key the API did not make
    video = {"TrainingVideoName": "Mine", "TrainingVideoKey": key}
    assert call(mod, "PUT", "/training/videos/{id}", video, "TV-9")[0] == 400
    bad = {"TrainingVideoName": "Mine", "TrainingVideoKey": "uploads/recipients/x/a.mp4"}
    assert call(mod, "PUT", "/training/videos/{id}", bad, "TV-9")[0] == 400

    aws.s3.put_object(Bucket="assets", Key=key, Body=b"0" * 1024, ContentType="video/mp4")
    status, body = call(mod, "PUT", "/training/videos/{id}", video, "TV-9")
    assert status == 200 and "X-Amz-Signature" in body["data"]["TrainingVideo"]
    listed = call(mod, "GET", "/training/videos")[1]["data"][0]
    assert listed["TrainingVideoKey"] == key and "X-Amz-Signature" in listed["TrainingVideo"]
    stored = aws.db.Table(f"{mod.TABLE_PREFIX}-training-videos").get_item(Key={"TrainingVideoID": "TV-9"})["Item"]
    assert "TrainingVideo" not in stored  # only the key is kept; links expire

    # a new file replaces the old one in S3
    _, up = call(mod, "POST", "/training/media/upload", {"fileName": "v2.mp4", "contentType": "video/mp4"})
    key2 = up["data"]["mediaKey"]
    aws.s3.put_object(Bucket="assets", Key=key2, Body=b"1", ContentType="video/mp4")
    assert call(mod, "PUT", "/training/videos/{id}", {"TrainingVideoName": "Mine", "TrainingVideoKey": key2}, "TV-9")[0] == 200
    names = [o["Key"] for o in aws.s3.list_objects_v2(Bucket="assets").get("Contents", [])]
    assert names == [key2]

    assert call(mod, "DELETE", "/training/videos/{id}", row_id="TV-9")[0] == 204
    assert aws.s3.list_objects_v2(Bucket="assets").get("KeyCount") == 0


def test_an_upload_of_the_wrong_kind_or_size_is_refused(mod, aws, monkeypatch):
    _, up = call(mod, "POST", "/training/media/upload", {"fileName": "c.png", "contentType": "image/png"})
    key = up["data"]["mediaKey"]
    aws.s3.put_object(Bucket="assets", Key=key, Body=b"0" * 64, ContentType="image/png")
    # an image is not a video
    assert call(mod, "PUT", "/training/videos/{id}", {"TrainingVideoName": "x", "TrainingVideoKey": key}, "TV-1")[0] == 400
    monkeypatch.setitem(mod.MEDIA_TYPES, "image/png", 10)
    status, body = call(mod, "PUT", "/training/certificates/{id}",
                        {"TrainingCertificateName": "x", "CertificateImageKey": key}, "TC-1")
    assert status == 413
    assert aws.s3.list_objects_v2(Bucket="assets").get("KeyCount") == 0  # the oversized file is removed


def test_a_certificate_image_becomes_its_page(mod, aws):
    _, up = call(mod, "POST", "/training/media/upload", {"fileName": "cert.png", "contentType": "image/png"})
    key = up["data"]["mediaKey"]
    aws.s3.put_object(Bucket="assets", Key=key, Body=b"png", ContentType="image/png")
    status, body = call(mod, "PUT", "/training/certificates/{id}",
                        {"TrainingCertificateName": "Cert", "CertificateImageKey": key,
                         "Certificate(html)": "<img src='blob:x'>"}, "TC-9")
    assert status == 200
    page = call(mod, "GET", "/training/certificates")[1]["data"][0]["Certificate(html)"]
    assert page.startswith("<!DOCTYPE html>") and "X-Amz-Signature" in page and "blob:" not in page


def test_a_media_key_on_the_wrong_kind_is_not_kept(mod, aws):
    _, up = call(mod, "POST", "/training/media/upload", {"fileName": "v.mp4", "contentType": "video/mp4"})
    status, body = call(mod, "PUT", "/training/paths/{id}",
                        {"TrainingPathName": "P", "TrainingVideoKey": up["data"]["mediaKey"]}, "TP-1")
    assert status == 200 and "TrainingVideoKey" not in body["data"]
