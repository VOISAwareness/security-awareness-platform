"""tracking: GET /ack/{token}, the "I've read this" button in an announcement
email (moto's in-memory DynamoDB; nothing leaves the process)."""
import importlib.util
import os
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from boto3.dynamodb.conditions import Key
from moto import mock_aws

BACKEND = Path(__file__).resolve().parents[1]
REGION = "ap-south-1"
CTX = SimpleNamespace(aws_request_id="test")


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("RECIPIENTS_TABLE", "t-recipients")
    os.environ.setdefault("EVENTS_TABLE", "t-events")
    os.environ.setdefault("TRACKING_TOKEN_INDEX", "trackingToken-index")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("tracking_ack", BACKEND / "tracking" / "lambda_function.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def db(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        res = boto3.resource("dynamodb", region_name=REGION)
        rec = res.create_table(
            TableName="t-recipients", BillingMode="PAY_PER_REQUEST",
            KeySchema=[{"AttributeName": "campaignId", "KeyType": "HASH"}, {"AttributeName": "recipientId", "KeyType": "RANGE"}],
            AttributeDefinitions=[{"AttributeName": n, "AttributeType": "S"} for n in ("campaignId", "recipientId", "trackingToken")],
            GlobalSecondaryIndexes=[{"IndexName": "trackingToken-index", "KeySchema": [{"AttributeName": "trackingToken", "KeyType": "HASH"}],
                                     "Projection": {"ProjectionType": "ALL"}}],
        )
        ev = res.create_table(
            TableName="t-events", BillingMode="PAY_PER_REQUEST",
            KeySchema=[{"AttributeName": "campaignId", "KeyType": "HASH"}, {"AttributeName": "eventId", "KeyType": "RANGE"}],
            AttributeDefinitions=[{"AttributeName": n, "AttributeType": "S"} for n in ("campaignId", "eventId")],
        )
        monkeypatch.setattr(mod, "recipients_table", rec)
        monkeypatch.setattr(mod, "events_table", ev)
        monkeypatch.setattr(mod, "APP_BASE_URL", "https://vshield.example.com")
        rec.put_item(Item={"campaignId": "ANR-001", "recipientId": "R1", "kind": "ANNOUNCEMENT", "trackingToken": "ann-token",
                           "recipientEmail": "ana@x.example", "sendStatus": "SENT", "expiresAt": 2_000_000_000})
        rec.put_item(Item={"campaignId": "CMP-001", "recipientId": "R2", "trackingToken": "phish-token",
                           "recipientEmail": "ben@x.example", "sendStatus": "SENT"})
        yield SimpleNamespace(rec=rec, ev=ev)


def hit(mod, route, token):
    path = route.split(" ", 1)[1].replace("{trackingToken}", token)
    return mod.lambda_handler({"routeKey": route, "rawPath": path, "pathParameters": {"trackingToken": token},
                               "requestContext": {"http": {"method": route.split(" ")[0]}}}, CTX)


def events(db, cid):
    return db.ev.query(KeyConditionExpression=Key("campaignId").eq(cid))["Items"]


def test_reading_it_is_noted_once_with_a_thank_you(mod, db):
    res = hit(mod, "GET /ack/{trackingToken}", "ann-token")
    assert res["statusCode"] == 200 and "Thanks for reading" in res["body"]
    assert "https://vshield.example.com/my-space" in res["body"]
    assert "default-src 'none'" in res["headers"]["Content-Security-Policy"]  # no script runs on it
    row = db.rec.get_item(Key={"campaignId": "ANR-001", "recipientId": "R1"})["Item"]
    first = row["acknowledgedAt"]
    [event] = events(db, "ANR-001")
    assert event["eventType"] == "ACKNOWLEDGED" and event["recipientId"] == "R1"
    assert event["expiresAt"] == 2_000_000_000 and "trackingToken" not in event  # the token is not kept again
    # pressed again: told it's already noted; nothing changes
    res = hit(mod, "GET /ack/{trackingToken}", "ann-token")
    assert res["statusCode"] == 200 and "Already noted" in res["body"]
    assert db.rec.get_item(Key={"campaignId": "ANR-001", "recipientId": "R1"})["Item"]["acknowledgedAt"] == first
    assert len(events(db, "ANR-001")) == 1


def test_a_token_works_only_on_its_own_kind_of_link(mod, db):
    # an announcement's token is never a phishing click (no click, no training)
    res = hit(mod, "GET /track/{trackingToken}", "ann-token")
    assert res["statusCode"] == 404 and "Invalid Link" in res["body"]
    row = db.rec.get_item(Key={"campaignId": "ANR-001", "recipientId": "R1"})["Item"]
    assert "clickedAt" not in row and events(db, "ANR-001") == []
    assert hit(mod, "POST /track/{trackingToken}/compromise", "ann-token")["statusCode"] == 404
    # a phishing token never acknowledges
    res = hit(mod, "GET /ack/{trackingToken}", "phish-token")
    assert res["statusCode"] == 404
    assert "acknowledgedAt" not in db.rec.get_item(Key={"campaignId": "CMP-001", "recipientId": "R2"})["Item"]
    # an unknown token
    assert hit(mod, "GET /ack/{trackingToken}", "nope")["statusCode"] == 404


def test_no_app_link_without_an_https_app_address(mod, db, monkeypatch):
    monkeypatch.setattr(mod, "APP_BASE_URL", "")
    assert "Go to VOIS Shield" not in hit(mod, "GET /ack/{trackingToken}", "ann-token")["body"]
