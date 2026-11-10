"""Unit tests for campaigns-api input hardening (no AWS calls)."""
import importlib.util
import os
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "campaigns-api" / "lambda_function.py"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("campaigns_api", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_clean_input_drops_server_owned_fields(mod):
    """A client must not be able to set its own id or status."""
    cleaned = mod.clean_input(
        {"campaignTitle": "keep", "campaignId": "CAMP-HACKED", "status": "SENT"}
    )
    assert cleaned == {"campaignTitle": "keep"}


def test_clean_input_strips_loaded_data(mod):
    """loadedData embeds the whole recipient list and must never be persisted."""
    cleaned = mod.clean_input(
        {"selectedListId": "ul-1", "loadedData": {"users": [{"email": "a@b.c"}]}}
    )
    assert "loadedData" not in cleaned
    assert cleaned["selectedListId"] == "ul-1"


def test_too_large_flags_oversized_items(mod):
    """Editor blobs with inlined base64 images can exceed the DynamoDB limit."""
    assert mod.too_large({"emailBody": "x"}) == 0
    big = {"landingPageContent": "x" * (mod.MAX_ITEM_BYTES + 1)}
    assert mod.too_large(big) > mod.MAX_ITEM_BYTES


def test_editable_statuses(mod):
    assert mod.EDITABLE_STATUSES == {"DRAFT", "REJECTED"}


# --- results, cancel, reinvoke, campaign type (moto's in-memory DynamoDB) ----

import json  # noqa: E402

import boto3  # noqa: E402
from moto import mock_aws  # noqa: E402


def table(db, name, keys, indexes=()):
    attrs = {k for k, _ in keys} | {k for _, ks in indexes for k, _ in ks}
    spec = dict(
        TableName=name,
        KeySchema=[{"AttributeName": k, "KeyType": t} for k, t in keys],
        AttributeDefinitions=[{"AttributeName": a, "AttributeType": "S"} for a in sorted(attrs)],
        BillingMode="PAY_PER_REQUEST",
    )
    if indexes:
        spec["GlobalSecondaryIndexes"] = [
            {"IndexName": n, "KeySchema": [{"AttributeName": k, "KeyType": t} for k, t in ks],
             "Projection": {"ProjectionType": "ALL"}}
            for n, ks in indexes
        ]
    return db.create_table(**spec)


@pytest.fixture
def env(mod, monkeypatch):
    for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"):
        monkeypatch.setenv(key, "test")
    with mock_aws():
        db = boto3.resource("dynamodb", region_name="ap-south-1")
        p = mod.TABLE_PREFIX
        c = table(db, f"{p}-campaigns", [("campaignId", "HASH")])
        r = table(db, f"{p}-recipients", [("campaignId", "HASH"), ("recipientId", "RANGE")])
        u = table(db, f"{p}-users", [("UserID", "HASH")], [("email-index", [("UserEMailID", "HASH")])])
        a = table(db, f"{p}-training-assignments", [("owner", "HASH"), ("assignmentId", "RANGE")])
        monkeypatch.setattr(mod, "dynamodb", db)
        monkeypatch.setattr(mod, "campaigns", c)
        monkeypatch.setattr(mod, "recipients_table", r)
        monkeypatch.setattr(mod, "users_table", u)
        monkeypatch.setattr(mod, "assignments_table", a)
        yield type("Env", (), {"campaigns": c, "recipients": r, "users": u, "assignments": a})


def call(mod, route, campaign_id=None, body=None):
    event = {"routeKey": route, "pathParameters": {"campaignId": campaign_id} if campaign_id else {}}
    if body is not None:
        event["body"] = json.dumps(body)
    resp = mod.lambda_handler(event, None)
    return resp["statusCode"], json.loads(resp["body"]) if resp.get("body") else None


def test_results_list_outcomes_without_tokens(mod, env):
    env.campaigns.put_item(Item={"campaignId": "C1", "status": "SENT"})
    env.users.put_item(Item={"UserID": "U2", "UserEMailID": "ben@x.example", "Department": "CARE", "Country": "India"})
    env.assignments.put_item(Item={"owner": "ana@x.example", "assignmentId": "A#1", "status": "COMPLETED", "quizPassed": True})
    # finished, but the quiz failed: not trained
    env.assignments.put_item(Item={"owner": "ben@x.example", "assignmentId": "A#2", "status": "COMPLETED", "quizPassed": False})
    env.recipients.put_item(Item={
        "campaignId": "C1", "recipientId": "R1", "recipientEmail": "Ana@x.example", "department": "AIDA",
        "country": "Spain", "sendStatus": "SENT", "openedAt": "t1", "clickedAt": "t2", "compromisedAt": "t3",
        "trainingAssignmentId": "A#1", "trackingToken": "secret-token", "trackingUrl": "https://x/track/secret-token",
        "tokenFingerprint": "abc",
    })
    env.recipients.put_item(Item={  # sent before rows carried a department
        "campaignId": "C1", "recipientId": "R2", "recipientEmail": "ben@x.example", "sendStatus": "SENT",
        "reportedAt": "t4", "trackingToken": "other-secret", "trainingAssignmentId": "A#2",
    })
    env.recipients.put_item(Item={"campaignId": "C1", "recipientId": "R3", "recipientEmail": "cy@x.example",
                                  "sendStatus": "FAILED"})
    env.recipients.put_item(Item={"campaignId": "C2", "recipientId": "R9", "recipientEmail": "z@x.example"})
    status, body = call(mod, "GET /campaigns/{campaignId}/results", "C1")
    assert status == 200
    assert "secret" not in json.dumps(body) and "tokenFingerprint" not in json.dumps(body)
    ana, ben, cy = body["data"]
    assert ana["recipientEmail"] == "ana@x.example" and ana["department"] == "AIDA"
    assert (ana["opened"], ana["clicked"], ana["compromised"], ana["reported"], ana["trained"]) == (True, True, True, False, True)
    assert (ben["department"], ben["country"], ben["opened"], ben["reported"]) == ("CARE", "India", True, True)
    assert ben["trained"] is False
    assert (cy["department"], cy["opened"]) == ("Unknown", False)
    assert body["summary"] == {"recipients": 3, "delivered": 2, "opened": 2, "clicked": 1,
                               "compromised": 1, "reported": 1, "trained": 1}


def test_results_of_an_unknown_campaign_is_404(mod, env):
    assert call(mod, "GET /campaigns/{campaignId}/results", "nope")[0] == 404


def test_cancel_a_scheduled_campaign_and_reinvoke_it(mod, env):
    env.campaigns.put_item(Item={"campaignId": "C1", "status": "APPROVED", "startAt": "2999-01-01T09:00:00Z",
                                 "approvedBy": "boss@x", "submittedBy": "me@x"})
    status, body = call(mod, "POST /campaigns/{campaignId}/cancel", "C1", {"actor": "Me@X", "reason": "Wrong list"})
    assert status == 200
    row = body["data"]
    assert (row["status"], row["cancelledBy"], row["cancellationReason"], row["cancelledFrom"]) == (
        "CANCELLED", "me@x", "Wrong list", "APPROVED")
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "C1", {"actor": "me@x", "reason": "again"})[0] == 409
    status, body = call(mod, "POST /campaigns/{campaignId}/reinvoke", "C1", {"actor": "me@x"})
    assert status == 200 and body["data"]["status"] == "DRAFT"
    assert "approvedBy" not in body["data"] and body["data"]["cancellationReason"] == "Wrong list"
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "C1", {"actor": "me@x"})[0] == 409


def test_what_cannot_be_cancelled(mod, env):
    env.campaigns.put_item(Item={"campaignId": "GO", "status": "APPROVED", "startAt": "2000-01-01T09:00:00Z"})
    env.campaigns.put_item(Item={"campaignId": "SENT", "status": "SENT"})
    env.campaigns.put_item(Item={"campaignId": "WAIT", "status": "PENDING_APPROVAL"})
    ask = {"actor": "me@x", "reason": "r"}
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "GO", ask)[0] == 409  # already started
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "SENT", ask)[0] == 409
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "nope", ask)[0] == 404
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", {"actor": "me@x"})[0] == 400  # no reason
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", {"reason": "r"})[0] == 400  # no actor
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", {"actor": "me@x", "reason": "x" * 501})[0] == 400
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", ask)[0] == 200
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "nope", {"actor": "me@x"})[0] == 404


def test_cancel_loses_cleanly_to_the_sender(mod, env, monkeypatch):
    """The sender locks APPROVED -> SENDING between our read and our write."""
    env.campaigns.put_item(Item={"campaignId": "C1", "status": "APPROVED", "startAt": "2999-01-01T09:00:00Z"})
    real = mod.get_campaign

    def read_then_lock(cid):
        row = real(cid)
        env.campaigns.update_item(Key={"campaignId": cid}, UpdateExpression="SET #s = :s",
                                  ExpressionAttributeNames={"#s": "status"}, ExpressionAttributeValues={":s": "SENDING"})
        return row

    monkeypatch.setattr(mod, "get_campaign", read_then_lock)
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "C1", {"actor": "me@x", "reason": "r"})[0] == 409
    assert env.campaigns.get_item(Key={"campaignId": "C1"})["Item"]["status"] == "SENDING"


def test_campaign_type_is_checked_on_create_and_edit(mod, env):
    status, body = call(mod, "POST /campaigns", body={"campaignTitle": "t", "campaignType": "Credential theft"})
    assert status == 201
    cid = body["data"]["campaignId"]
    assert call(mod, "POST /campaigns", body={"campaignType": "Ransomware"})[0] == 400
    assert call(mod, "PUT /campaigns/{campaignId}", cid, {"campaignType": "Ransomware"})[0] == 400
    assert call(mod, "PUT /campaigns/{campaignId}", cid, {"campaignType": "Custom"})[0] == 200
    assert call(mod, "PUT /campaigns/{campaignId}", cid, {"campaignTitle": "no type change"})[0] == 200
