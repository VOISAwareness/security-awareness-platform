"""reference-api: POST /media/images/upload, hosted pictures for emails and
browser pages (moto's in-memory S3; nothing leaves the process)."""
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
ROUTE = "POST /media/images/upload"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("reference_api_media", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def s3(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        client = boto3.client("s3", region_name=REGION)
        client.create_bucket(Bucket="assets", CreateBucketConfiguration={"LocationConstraint": REGION})
        monkeypatch.setattr(mod, "s3_client", client)
        monkeypatch.setattr(mod, "UPLOAD_BUCKET", "assets")
        monkeypatch.setattr(mod, "MEDIA_BASE_URL", "https://cdn.example.net/media")
        yield client


def call(mod, body):
    event = {"routeKey": ROUTE, "body": json.dumps(body) if body is not None else None}
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


def test_a_picture_upload_is_a_form_limited_to_one_key_type_and_size(mod, s3):
    status, body = call(mod, {"fileName": "Company Logo.PNG", "contentType": "image/png"})
    assert status == 201
    data = body["data"]
    assert data["maxBytes"] == 2 * 1024 * 1024
    key = data["fields"]["key"]
    assert key.startswith("public-media/") and key.endswith("/Company_Logo.png")
    folder = key.split("/")[1]
    assert len(folder) == 32 and all(c in "0123456789abcdef" for c in folder)
    assert data["url"] == f"https://cdn.example.net/media/{folder}/Company_Logo.png"
    assert data["fields"]["Content-Type"] == "image/png"
    assert "immutable" in data["fields"]["Cache-Control"]
    policy = json.loads(__import__("base64").b64decode(data["fields"]["policy"]))
    assert ["content-length-range", 1, 2 * 1024 * 1024] in policy["conditions"]
    assert {"Content-Type": "image/png"} in policy["conditions"]


@pytest.mark.parametrize("content_type", ["image/svg+xml", "text/html", "", None])
def test_only_raster_pictures(mod, s3, content_type):
    status, body = call(mod, {"fileName": "x", "contentType": content_type})
    assert status == 400 and "PNG" in body["error"]["message"]


def test_the_name_gets_the_types_extension(mod):
    assert mod.media_image_name("../../evil.html", "image/jpeg") == "evil.jpg"
    assert mod.media_image_name("", "image/webp") == "image.webp"
    assert mod.media_image_name("photo.final.jpeg", "image/gif") == "photo.final.gif"


def test_not_configured_is_503(mod, s3, monkeypatch):
    monkeypatch.setattr(mod, "MEDIA_BASE_URL", "")
    assert call(mod, {"fileName": "a.png", "contentType": "image/png"})[0] == 503
