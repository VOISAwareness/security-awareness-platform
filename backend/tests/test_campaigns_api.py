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
    env.campaigns.put_item(Item={"campaignId": "SENDING", "status": "SENDING", "startAt": "2000-01-01T09:00:00Z"})
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "SENDING", ask)[0] == 409  # being sent
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "SENT", ask)[0] == 409
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "nope", ask)[0] == 404
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", {"actor": "me@x"})[0] == 400  # no reason
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", {"reason": "r"})[0] == 400  # no actor
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", {"actor": "me@x", "reason": "x" * 501})[0] == 400
    assert call(mod, "POST /campaigns/{campaignId}/cancel", "WAIT", ask)[0] == 200
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "nope", {"actor": "me@x"})[0] == 404


def test_a_campaign_whose_start_passed_unsent_is_never_stuck(mod, env):
    """Its start passed but it could not be sent (still APPROVED): it can be
    cancelled; one marked SEND_FAILED can be reinvoked. Both go back to DRAFT."""
    env.campaigns.put_item(Item={"campaignId": "LATE", "status": "APPROVED", "startAt": "2000-01-01T09:00:00Z"})
    status, body = call(mod, "POST /campaigns/{campaignId}/cancel", "LATE", {"actor": "elena@x", "reason": "No recipients"})
    assert status == 200 and body["data"]["status"] == "CANCELLED"
    env.campaigns.put_item(Item={"campaignId": "FAIL", "status": "SEND_FAILED", "failureReason": "Campaign has no recipients.",
                                 "failedAt": "2026-11-19T09:00:00Z", "approvedBy": "boss@x"})
    status, body = call(mod, "POST /campaigns/{campaignId}/reinvoke", "FAIL", {"actor": "elena@x"})
    assert status == 200
    row = body["data"]
    assert row["status"] == "DRAFT" and "failureReason" not in row and "approvedBy" not in row
    env.campaigns.put_item(Item={"campaignId": "OK", "status": "SENT"})
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "OK", {"actor": "elena@x"})[0] == 409


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


def test_the_ten_email_types_are_accepted_and_named_when_refused(mod, env):
    assert len(mod.EMAIL_TYPES) == 10 and not set(mod.EMAIL_TYPES) & set(mod.LEGACY_TYPES)
    for kind in mod.EMAIL_TYPES:
        status, body = call(mod, "POST /campaigns", body={"campaignTitle": kind, "campaignType": kind})
        assert status == 201, kind
        assert body["data"]["campaignType"] == kind
    status, body = call(mod, "POST /campaigns", body={"campaignType": "Ransomware"})
    assert status == 400
    message = body["error"]["message"]
    assert "QR Code" in message and "Call / Callback" in message
    assert "Travel scam" not in message  # older names are kept, never offered


def test_campaigns_saved_with_an_older_type_stay_editable(mod, env):
    for kind in mod.LEGACY_TYPES:
        status, body = call(mod, "POST /campaigns", body={"campaignTitle": kind, "campaignType": kind})
        assert status == 201, kind
        cid = body["data"]["campaignId"]
        assert call(mod, "PUT /campaigns/{campaignId}", cid, {"campaignTitle": "renamed", "campaignType": kind})[0] == 200


def test_the_list_returns_every_campaign_across_pages(mod, env, monkeypatch):
    for i in range(130):
        env.campaigns.put_item(Item={"campaignId": f"C{i:03d}", "status": "SENT" if i % 2 else "DRAFT",
                                     "createdAt": f"2026-10-{1 + i % 28:02d}T00:00:00Z"})
    real_scan, real_query = env.campaigns.scan, env.campaigns.query

    def small_pages(real):
        return lambda **kw: real(**{**kw, "Limit": 25})

    monkeypatch.setattr(env.campaigns, "scan", small_pages(real_scan))
    monkeypatch.setattr(env.campaigns, "query", small_pages(real_query))
    status, body = call(mod, "GET /campaigns")
    assert status == 200 and body["count"] == 130 and body["truncated"] is False
    assert body["data"][0]["createdAt"] >= body["data"][-1]["createdAt"]


def test_a_list_too_large_for_one_response_is_cut_and_says_so(mod, env, monkeypatch):
    for i in range(5):
        env.campaigns.put_item(Item={"campaignId": f"C{i}", "status": "DRAFT", "emailBody": "x" * 1000})
    monkeypatch.setattr(mod, "MAX_LIST_BYTES", 2500)
    body = call(mod, "GET /campaigns")[1]
    assert body["count"] == 2 and body["truncated"] is True


def test_a_warm_ping_returns_at_once(mod):
    assert mod.lambda_handler({"warm": True}, None) == {"warm": True}


TALLY_CASES = Path(__file__).resolve().parents[2] / "frontend" / "VShield" / "src" / "services" / "fixtures" / "tallyCases.json"


def test_tallies_count_as_the_home_screen_does(mod):
    for case in json.loads(TALLY_CASES.read_text())["cases"]:
        assert mod.tally_rows(case["rows"]) == case["tally"], case["name"]


def test_tallies_route(mod, monkeypatch):
    rows = {"C1": [{"recipientEmail": "a@x.example", "sendStatus": "SENT", "clicked": True, "country": "UK"}], "C2": []}
    monkeypatch.setattr(mod, "get_campaign", lambda cid: {"campaignId": cid} if cid in rows else None)
    monkeypatch.setattr(mod, "result_rows", lambda cid: rows[cid])
    call = lambda ids: mod.lambda_handler({"routeKey": "GET /campaigns/tallies", "queryStringParameters": {"ids": ids}}, None)  # noqa: E731
    res = call("C1,C2,NOPE,C1")
    assert res["statusCode"] == 200
    data = json.loads(res["body"])["data"]
    assert sorted(data) == ["C1", "C2"]  # unknown ids left out, repeats once
    assert data["C1"]["hooked"] == 1 and data["C1"]["countries"] == {"UK": {"reached": 1, "clicked": 1}}
    assert data["C2"]["targeted"] == 0
    assert call("")["statusCode"] == 400
    assert call(",".join(f"C{i}" for i in range(51)))["statusCode"] == 400


def test_the_summary_view_leaves_out_the_html(mod, monkeypatch):
    items = [{"campaignId": "C1", "campaignTitle": "T", "emailBody": "<p>x</p>", "landingPageContent": "<div/>",
              "browserPageHtml": "<form/>", "CoverImageID": "k", "createdAt": "2026-11-01"}]
    monkeypatch.setattr(mod, "read_all", lambda *a, **k: ([dict(i) for i in items], False))
    call = lambda qs: json.loads(mod.lambda_handler({"routeKey": "GET /campaigns", "queryStringParameters": qs}, None)["body"])["data"]  # noqa: E731
    assert call({"view": "summary"}) == [{"campaignId": "C1", "campaignTitle": "T", "createdAt": "2026-11-01"}]
    assert call(None)[0]["emailBody"] == "<p>x</p>"


# --- hold and resume ----------------------------------------------------------

FUTURE = {"startTime": "2999-01-01T09:00", "startAt": "2999-01-01T09:00:00Z",
          "endTime": "2999-01-08T09:00", "endAt": "2999-01-08T09:00:00Z", "timeZone": "Europe/London"}


def test_hold_a_scheduled_campaign_and_resume_it_with_new_dates(mod, env):
    env.campaigns.put_item(Item={"campaignId": "C1", "status": "APPROVED", "startAt": "2998-01-01T09:00:00Z",
                                 "startTime": "2998-01-01T09:00", "approvedBy": "boss@x"})
    status, body = call(mod, "POST /campaigns/{campaignId}/hold", "C1", {"actor": "Me@X", "reason": "Office closed"})
    assert status == 200
    row = body["data"]
    assert (row["status"], row["heldBy"], row["holdReason"]) == ("ON_HOLD", "me@x", "Office closed")
    assert call(mod, "POST /campaigns/{campaignId}/hold", "C1", {"actor": "me@x"})[0] == 409, "already on hold"

    status, body = call(mod, "POST /campaigns/{campaignId}/resume", "C1", {"actor": "me@x", **FUTURE})
    assert status == 200
    row = body["data"]
    assert (row["status"], row["resumedBy"], row["approvedBy"]) == ("APPROVED", "me@x", "boss@x"), "the approval stands"
    assert (row["startTime"], row["startAt"], row["endAt"], row["timeZone"]) == (
        "2999-01-01T09:00", "2999-01-01T09:00:00Z", "2999-01-08T09:00:00Z", "Europe/London")
    assert call(mod, "POST /campaigns/{campaignId}/resume", "C1", {"actor": "me@x", **FUTURE})[0] == 409, "not on hold"


def test_resume_needs_a_new_start_in_the_future_and_an_end_after_it(mod, env):
    env.campaigns.put_item(Item={"campaignId": "H", "status": "ON_HOLD"})
    ask = lambda **kw: call(mod, "POST /campaigns/{campaignId}/resume", "H", {"actor": "me@x", **FUTURE, **kw})  # noqa: E731
    assert ask(startAt="", startTime="")[0] == 400
    assert ask(startAt="2000-01-01T09:00:00Z")[0] == 400, "in the past"
    assert ask(startAt="2999-01-01T09:00:00")[0] == 400, "no zone"
    assert ask(endAt="2998-12-31T09:00:00Z")[0] == 400, "end before start"
    assert ask(endAt="", endTime="")[0] == 400, "an end is needed unless it auto-ends"
    assert call(mod, "POST /campaigns/{campaignId}/resume", "H", {**FUTURE})[0] == 400, "no actor"
    assert call(mod, "POST /campaigns/{campaignId}/resume", "nope", {"actor": "me@x", **FUTURE})[0] == 404
    assert env.campaigns.get_item(Key={"campaignId": "H"})["Item"]["status"] == "ON_HOLD"


def test_resume_without_an_end_when_the_campaign_auto_ends(mod, env):
    env.campaigns.put_item(Item={"campaignId": "A", "status": "ON_HOLD", "autoEndPostSending": True,
                                 "endAt": "2998-01-08T09:00:00Z", "endTime": "2998-01-08T09:00"})
    status, body = call(mod, "POST /campaigns/{campaignId}/resume", "A",
                        {"actor": "me@x", "startTime": FUTURE["startTime"], "startAt": FUTURE["startAt"]})
    assert status == 200
    assert body["data"]["status"] == "APPROVED" and "endAt" not in body["data"]


def test_what_cannot_be_held(mod, env):
    for cid, st in (("S", "SENDING"), ("D", "DRAFT"), ("P", "PENDING_APPROVAL"), ("X", "SENT")):
        env.campaigns.put_item(Item={"campaignId": cid, "status": st})
        assert call(mod, "POST /campaigns/{campaignId}/hold", cid, {"actor": "me@x"})[0] == 409, st
    assert call(mod, "POST /campaigns/{campaignId}/hold", "nope", {"actor": "me@x"})[0] == 404
    assert call(mod, "POST /campaigns/{campaignId}/hold", "S", {})[0] == 400


def test_a_held_campaign_can_be_cancelled(mod, env):
    env.campaigns.put_item(Item={"campaignId": "H", "status": "ON_HOLD"})
    status, body = call(mod, "POST /campaigns/{campaignId}/cancel", "H", {"actor": "me@x", "reason": "Not needed"})
    assert status == 200 and (body["data"]["status"], body["data"]["cancelledFrom"]) == ("CANCELLED", "ON_HOLD")


def test_reinvoke_takes_new_dates_when_given(mod, env):
    env.campaigns.put_item(Item={"campaignId": "C", "status": "CANCELLED", "startAt": "2000-01-01T09:00:00Z"})
    status, body = call(mod, "POST /campaigns/{campaignId}/reinvoke", "C", {"actor": "me@x", **FUTURE})
    assert status == 200
    row = body["data"]
    assert (row["status"], row["startAt"], row["endTime"]) == ("DRAFT", "2999-01-01T09:00:00Z", "2999-01-08T09:00")
    env.campaigns.put_item(Item={"campaignId": "C2", "status": "CANCELLED"})
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "C2", {"actor": "me@x", "startAt": "2000-01-01T09:00:00Z",
                                                                     "startTime": "2000-01-01T09:00"})[0] == 400
    assert env.campaigns.get_item(Key={"campaignId": "C2"})["Item"]["status"] == "CANCELLED"


def test_reinvoke_with_a_new_start_drops_an_old_end_that_is_not_after_it(mod, env):
    """An auto-ending campaign reinvoked with only a start must not keep an
    end before that start; an end that is still after it stays."""
    start_only = {"actor": "me@x", "startTime": "2999-01-01T09:00", "startAt": "2999-01-01T09:00:00Z", "timeZone": "Europe/London"}
    old = {"status": "CANCELLED", "startAt": "2000-01-01T09:00:00Z", "endTime": "2000-01-02T09:00", "endAt": "2000-01-02T09:00:00Z"}
    env.campaigns.put_item(Item={"campaignId": "C", **old})
    status, body = call(mod, "POST /campaigns/{campaignId}/reinvoke", "C", start_only)
    assert status == 200
    row = env.campaigns.get_item(Key={"campaignId": "C"})["Item"]
    assert (row["status"], row["startAt"]) == ("DRAFT", "2999-01-01T09:00:00Z")
    assert "endAt" not in row and "endTime" not in row
    # an end after the new start is still a valid window: kept
    env.campaigns.put_item(Item={"campaignId": "C2", **old, "endTime": "2999-01-05T09:00", "endAt": "2999-01-05T09:00:00Z"})
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "C2", start_only)[0] == 200
    assert env.campaigns.get_item(Key={"campaignId": "C2"})["Item"]["endAt"] == "2999-01-05T09:00:00Z"
    # no dates in the body: the schedule is left alone
    env.campaigns.put_item(Item={"campaignId": "C3", **old})
    assert call(mod, "POST /campaigns/{campaignId}/reinvoke", "C3", {"actor": "me@x"})[0] == 200
    assert env.campaigns.get_item(Key={"campaignId": "C3"})["Item"]["endAt"] == "2000-01-02T09:00:00Z"
