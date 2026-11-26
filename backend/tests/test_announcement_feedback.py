"""announcement-feedback: SES Delivery / Bounce / Complaint events (through SNS)
mark the person's row (moto's in-memory DynamoDB; nothing leaves the process)."""
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from moto import mock_aws

BACKEND = Path(__file__).resolve().parents[1]
REGION = "ap-south-1"
CTX = SimpleNamespace(aws_request_id="test")


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("RECIPIENTS_TABLE", "t-recipients")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("announcement_feedback", BACKEND / "announcement-feedback" / "lambda_function.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def rec(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        tbl = boto3.resource("dynamodb", region_name=REGION).create_table(
            TableName="t-recipients", BillingMode="PAY_PER_REQUEST",
            KeySchema=[{"AttributeName": "campaignId", "KeyType": "HASH"}, {"AttributeName": "recipientId", "KeyType": "RANGE"}],
            AttributeDefinitions=[{"AttributeName": "campaignId", "AttributeType": "S"}, {"AttributeName": "recipientId", "AttributeType": "S"}])
        monkeypatch.setattr(mod, "recipients_table", tbl)
        tbl.put_item(Item={"campaignId": "ANR-001", "recipientId": "R1", "kind": "ANNOUNCEMENT", "recipientEmail": "ana@x.example", "sendStatus": "SENT"})
        tbl.put_item(Item={"campaignId": "CMP-001", "recipientId": "R9", "recipientEmail": "ben@x.example", "sendStatus": "SENT"})
        yield tbl


def ses_event(kind, rid="R1", aid="ANR-001", **body):
    mail = {"messageId": "m-1", "destination": ["ana@x.example"], "tags": {"announcementId": [aid], "recipientId": [rid]}}
    return {"Records": [{"EventSource": "aws:sns", "Sns": {"Message": json.dumps({"eventType": kind, "mail": mail, **body})}}]}


def row(rec, aid="ANR-001", rid="R1"):
    return rec.get_item(Key={"campaignId": aid, "recipientId": rid})["Item"]


def test_delivery_bounce_and_complaint_mark_the_row(mod, rec):
    assert mod.lambda_handler(ses_event("Delivery", delivery={"timestamp": "2026-11-20T09:00:05.000Z"}), CTX)["applied"] == 1
    assert row(rec)["deliveredAt"] == "2026-11-20T09:00:05.000Z"
    mod.lambda_handler(ses_event("Bounce", bounce={"bounceType": "Permanent", "bounceSubType": "NoEmail",
                                                   "timestamp": "2026-11-20T09:00:09Z",
                                                   "bouncedRecipients": [{"emailAddress": "ana@x.example", "diagnosticCode": "550 no such user"}]}), CTX)
    r = row(rec)
    assert (r["bouncedAt"], r["bounceType"], r["bounceSubType"]) == ("2026-11-20T09:00:09Z", "Permanent", "NoEmail")
    assert "diagnosticCode" not in json.dumps(r, default=str) and "550" not in json.dumps(r, default=str)  # nothing else kept
    mod.lambda_handler(ses_event("Complaint", complaint={"timestamp": "2026-11-20T11:00:00Z"}), CTX)
    assert row(rec)["complainedAt"] == "2026-11-20T11:00:00Z"
    # a repeat keeps the first time
    mod.lambda_handler(ses_event("Delivery", delivery={"timestamp": "2026-11-21T00:00:00Z"}), CTX)
    assert row(rec)["deliveredAt"] == "2026-11-20T09:00:05.000Z"


def test_only_announcement_rows_are_touched_and_junk_is_skipped(mod, rec):
    out = mod.lambda_handler(ses_event("Bounce", rid="R9", aid="CMP-001", bounce={"bounceType": "Permanent"}), CTX)
    assert out == {"applied": 0, "skipped": 1} and "bouncedAt" not in row(rec, "CMP-001", "R9")  # a phishing row
    assert mod.lambda_handler(ses_event("Bounce", rid="R-gone", bounce={}), CTX)["skipped"] == 1  # no such row
    assert mod.lambda_handler(ses_event("Send"), CTX)["skipped"] == 1  # not an event we keep
    untagged = {"Records": [{"Sns": {"Message": json.dumps({"eventType": "Bounce", "mail": {}})}}]}
    assert mod.lambda_handler(untagged, CTX)["skipped"] == 1
    assert mod.lambda_handler({"Records": [{"Sns": {"Message": "not json"}}]}, CTX)["skipped"] == 1
    # an odd bounce type is kept as Undetermined
    mod.lambda_handler(ses_event("Bounce", bounce={"bounceType": "Weird"}), CTX)
    assert row(rec)["bounceType"] == "Undetermined"
