"""reference-api: announcement templates and roll-outs (moto's in-memory
DynamoDB; nothing leaves the process)."""
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
ANA, BEN = "ana@x.example", "ben@x.example"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("reference_api_announcements", BACKEND / "reference-api" / "lambda_function.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def table(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name=REGION)
        tbl = db.create_table(
            TableName=f"{mod.TABLE_PREFIX}-announcements",
            KeySchema=[{"AttributeName": "announcementId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "announcementId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        monkeypatch.setattr(mod, "dynamodb", db)
        yield tbl


def call(mod, route, body=None, row_id=None, query=None):
    event = {"routeKey": route, "pathParameters": {"id": row_id} if row_id else None,
             "queryStringParameters": query, "body": json.dumps(body) if body is not None else None}
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


TEMPLATE = {"kind": "TEMPLATE", "actor": ANA, "announcementScenarioName": "Password policy",
            "announcementEmailSubject": "New rules", "announcementEmailBody": "<p>Hi</p>"}


def test_a_template_is_numbered_listed_and_its_id_is_its_scenario_id(mod, table):
    table.put_item(Item={"announcementId": "ANC-006", "kind": "TEMPLATE", "status": "ACTIVE"})
    status, body = call(mod, "POST /announcements", {**TEMPLATE, "status": "SENT", "createdBy": "someone@else"})
    assert status == 201
    row = body["data"]
    assert row["announcementId"] == row["announcementScenarioId"] == "ANC-007"
    assert (row["status"], row["createdBy"]) == ("ACTIVE", ANA)  # never what the body claims
    listed = call(mod, "GET /announcements", query={"kind": "TEMPLATE"})[1]
    assert [r["announcementId"] for r in listed["data"]][0] == "ANC-007" and listed["count"] == 2
    assert call(mod, "GET /announcements", query={"kind": "ROLLOUT"})[1]["count"] == 0


def test_a_rollout_is_published_or_sent_for_approval(mod, table):
    rollout = {"kind": "ROLLOUT", "actor": ANA, "announcementCampaignTitle": "Q4 reminder", "selectedListId": "UL-1"}
    assert call(mod, "POST /announcements", rollout)[0] == 400  # publish or request?
    status, body = call(mod, "POST /announcements", {**rollout, "submit": "approve"})
    assert status == 201 and body["data"]["announcementId"] == "ANR-001"
    assert (body["data"]["status"], body["data"]["approvedBy"]) == ("APPROVED", ANA)
    body = call(mod, "POST /announcements", {**rollout, "submit": "request"})[1]
    assert body["data"]["announcementId"] == "ANR-002" and body["data"]["status"] == "PENDING_APPROVAL"


def test_approval_rules(mod, table):
    body = call(mod, "POST /announcements", {"kind": "ROLLOUT", "actor": ANA, "announcementCampaignTitle": "R", "submit": "request"})[1]
    rid = body["data"]["announcementId"]
    assert call(mod, "POST /announcements/{id}/decision", {"actor": ANA, "role": "Admin", "decision": "approve"}, rid)[0] == 403  # own
    assert call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "decision": "reject"}, rid)[0] == 400  # no reason
    status, body = call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "role": "Campaign Manager", "decision": "reject", "comments": "Fix the date"}, rid)
    assert status == 200 and body["data"]["status"] == "REJECTED" and body["data"]["rejectedBy"] == BEN
    # the creator changes it, which sends it again
    status, body = call(mod, "PUT /announcements/{id}", {"actor": ANA, "announcementCampaignTitle": "R2"}, rid)
    assert status == 200 and body["data"]["status"] == "PENDING_APPROVAL"
    assert call(mod, "PUT /announcements/{id}", {"actor": BEN, "announcementCampaignTitle": "x"}, rid)[0] == 403
    status, body = call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "role": "Campaign Manager", "decision": "approve"}, rid)
    assert status == 200 and body["data"]["status"] == "APPROVED"
    assert call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "role": "Campaign Manager", "decision": "approve"}, rid)[0] == 409  # done
    assert call(mod, "PUT /announcements/{id}", {"actor": ANA, "announcementCampaignTitle": "late"}, rid)[0] == 409
    assert call(mod, "DELETE /announcements/{id}", query={"actor": ANA}, row_id=rid)[0] == 409


def test_admins_approve_too_and_no_one_else(mod, table):
    req = {"kind": "ROLLOUT", "announcementCampaignTitle": "R", "submit": "request"}
    rid = call(mod, "POST /announcements", {**req, "actor": ANA})[1]["data"]["announcementId"]
    for role in (None, "Campaign Creator", "Regular User"):
        status, body = call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "role": role, "decision": "approve"}, rid)
        assert status == 403 and "Admin or a Campaign Manager" in body["error"]["message"]
    status, body = call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "role": "Admin", "decision": "approve"}, rid)
    assert status == 200 and body["data"]["status"] == "APPROVED" and body["data"]["approvedBy"] == BEN
    # an Admin's own roll-out still needs someone else
    rid = call(mod, "POST /announcements", {**req, "actor": BEN})[1]["data"]["announcementId"]
    assert call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "role": "Admin", "decision": "approve"}, rid)[0] == 403
    status, body = call(mod, "POST /announcements/{id}/decision",
                        {"actor": ANA, "role": "Admin", "decision": "reject", "comments": "Wrong list"}, rid)
    assert status == 200 and body["data"]["status"] == "REJECTED"


def test_cancelling_an_approved_rollout_before_it_ends(mod, table):
    later = {"kind": "ROLLOUT", "actor": ANA, "announcementCampaignTitle": "Later", "submit": "approve",
             "announcementStartTime": "2998-01-01T09:00", "announcementEndTime": "2998-01-05T17:00"}
    rid = call(mod, "POST /announcements", later)[1]["data"]["announcementId"]
    cancel = lambda who, role=None, reason="Wrong week": call(  # noqa: E731
        mod, "POST /announcements/{id}/cancel", {"actor": who, "role": role, "reason": reason}, rid)
    assert cancel(BEN, "Campaign Creator")[0] == 403  # not hers, not an approver
    assert cancel(ANA, reason=" ")[0] == 400  # a reason is required
    status, body = cancel(BEN, "Campaign Manager")
    assert status == 200 and body["data"]["status"] == "CANCELLED"
    assert body["data"]["cancelledBy"] == BEN and body["data"]["cancelReason"] == "Wrong week"
    assert cancel(ANA)[0] == 409  # already cancelled
    # its creator cancels her own; a pending one is not cancelled (it is deleted or rejected)
    rid = call(mod, "POST /announcements", later)[1]["data"]["announcementId"]
    assert cancel(ANA)[0] == 200
    rid = call(mod, "POST /announcements", {**later, "submit": "request"})[1]["data"]["announcementId"]
    assert cancel(ANA, "Admin")[0] == 409
    # a send in progress is cancelled too (announcement-sender then stops)
    table.put_item(Item={"announcementId": "ANR-077", "kind": "ROLLOUT", "status": "SENDING", "createdBy": ANA,
                         "announcementStartTime": "2998-01-01T09:00"})
    status, body = call(mod, "POST /announcements/{id}/cancel", {"actor": ANA, "reason": "Wrong list"}, "ANR-077")
    assert status == 200 and body["data"]["status"] == "CANCELLED"
    # over: nothing left to cancel
    rid = call(mod, "POST /announcements", {**later, "announcementStartTime": "2026-01-01T09:00",
                                            "announcementEndTime": "2026-01-02T09:00"})[1]["data"]["announcementId"]
    status, body = cancel(ANA, "Admin")
    assert status == 409 and "ended" in body["error"]["message"]
    # a template is never cancelled; the body cannot set the cancel fields
    tid = call(mod, "POST /announcements", {**TEMPLATE, "cancelledBy": "x", "cancelReason": "y"})[1]["data"]
    assert "cancelledBy" not in tid and "cancelReason" not in tid
    rid = tid["announcementId"]
    assert cancel(ANA, "Admin")[0] == 409


def test_wall_clock_times_are_uk_time_and_the_server_keeps_the_instants(mod, table):
    utc = lambda s: mod.instant(s + "Z")  # noqa: E731
    assert mod.uk_instant("2026-01-15T09:00") == utc("2026-01-15T09:00")  # GMT
    assert mod.uk_instant("2026-07-15T09:00") == utc("2026-07-15T08:00")  # BST, an hour ahead
    # the changes: last Sunday of March (29 Mar 2026) and of October (25 Oct 2026), at 01:00 UTC
    assert mod.uk_instant("2026-03-29T00:30") == utc("2026-03-29T00:30")
    assert mod.uk_instant("2026-03-29T03:00") == utc("2026-03-29T02:00")
    assert mod.uk_instant("2026-10-24T12:00") == utc("2026-10-24T11:00")
    assert mod.uk_instant("2026-10-25T12:00") == utc("2026-10-25T12:00")
    assert mod.uk_instant("2026-07-15T09:00+05:30") == utc("2026-07-15T03:30")  # a zone given is used
    assert mod.uk_instant("") is None and mod.uk_instant("soon") is None
    body = {"kind": "ROLLOUT", "actor": ANA, "submit": "request", "announcementCampaignTitle": "R",
            "announcementStartTime": "2998-07-01T09:00", "announcementEndTime": "2998-07-02T17:30",
            "startAt": "1999-01-01T00:00:00Z"}  # not the client's to set
    row = call(mod, "POST /announcements", body)[1]["data"]
    assert row["startAt"] == "2998-07-01T08:00:00Z" and row["endAt"] == "2998-07-02T16:30:00Z"
    row = call(mod, "PUT /announcements/{id}", {"actor": ANA, "announcementStartTime": "2998-12-01T09:00"},
               row["announcementId"])[1]["data"]
    assert row["startAt"] == "2998-12-01T09:00:00Z"  # GMT in December
    # ends when sent (no end): it ends at its start
    row = call(mod, "POST /announcements", {**body, "announcementEndTime": ""})[1]["data"]
    assert row["endAt"] is None and mod.rollout_times(row) == (mod.instant(row["startAt"]),) * 2


def test_what_is_refused(mod, table):
    assert call(mod, "POST /announcements", {**TEMPLATE, "actor": ""})[0] == 400
    assert call(mod, "POST /announcements", {**TEMPLATE, "kind": "EMAIL"})[0] == 400
    assert call(mod, "POST /announcements", {**TEMPLATE, "announcementScenarioName": " "})[0] == 400
    assert call(mod, "POST /announcements", {**TEMPLATE, "announcementEmailBody": "x" * 400_000})[0] == 400
    assert call(mod, "PUT /announcements/{id}", {"actor": ANA}, "ANC-999")[0] == 404
    rid = call(mod, "POST /announcements", TEMPLATE)[1]["data"]["announcementId"]
    assert call(mod, "POST /announcements/{id}/decision", {"actor": BEN, "decision": "approve"}, rid)[0] == 409  # a template
    assert call(mod, "DELETE /announcements/{id}", query={"actor": BEN}, row_id=rid)[0] == 403
    assert call(mod, "DELETE /announcements/{id}", query={"actor": ANA}, row_id=rid)[0] == 204


def test_admins_and_campaign_managers_delete_any_announcement_but_never_a_sent_one(mod, table):
    rid = call(mod, "POST /announcements", TEMPLATE)[1]["data"]["announcementId"]  # Ana's
    assert call(mod, "DELETE /announcements/{id}", query={"actor": BEN, "role": "Campaign Creator"}, row_id=rid)[0] == 403
    assert call(mod, "DELETE /announcements/{id}", query={"actor": BEN, "role": "Campaign Manager"}, row_id=rid)[0] == 204
    rid = call(mod, "POST /announcements", TEMPLATE)[1]["data"]["announcementId"]
    assert call(mod, "DELETE /announcements/{id}", query={"actor": BEN, "role": "Admin"}, row_id=rid)[0] == 204
    # a roll-out waiting for approval, or approved to start later, has not gone out
    later = {"kind": "ROLLOUT", "actor": ANA, "announcementCampaignTitle": "Later", "announcementStartTime": "2999-01-01T09:00"}
    rid = call(mod, "POST /announcements", {**later, "submit": "request"})[1]["data"]["announcementId"]
    assert call(mod, "DELETE /announcements/{id}", query={"actor": BEN, "role": "Admin"}, row_id=rid)[0] == 204
    rid = call(mod, "POST /announcements", {**later, "submit": "approve"})[1]["data"]["announcementId"]
    assert call(mod, "DELETE /announcements/{id}", query={"actor": BEN, "role": "Campaign Manager"}, row_id=rid)[0] == 204
    # started, sending or sent: nobody deletes it, not even its creator or an Admin
    sent = {**later, "announcementStartTime": "2026-01-01T09:00"}
    rid = call(mod, "POST /announcements", {**sent, "submit": "approve"})[1]["data"]["announcementId"]
    status, body = call(mod, "DELETE /announcements/{id}", query={"actor": BEN, "role": "Admin"}, row_id=rid)
    assert status == 409 and "sent" in body["error"]["message"]
    assert call(mod, "DELETE /announcements/{id}", query={"actor": ANA}, row_id=rid)[0] == 409
    table.put_item(Item={"announcementId": "ANR-050", "kind": "ROLLOUT", "status": "SENT", "createdBy": ANA})
    assert call(mod, "DELETE /announcements/{id}", query={"actor": ANA, "role": "Admin"}, row_id="ANR-050")[0] == 409


def test_a_rollout_expires_a_year_after_it_ends(mod, table):
    body = {"kind": "ROLLOUT", "actor": ANA, "submit": "request", "announcementCampaignTitle": "R",
            "announcementStartTime": "2998-03-01T09:00", "announcementEndTime": "2998-03-10T17:00", "expiresAt": 1}
    row = call(mod, "POST /announcements", body)[1]["data"]
    ends = mod.uk_instant("2998-03-10T17:00")
    assert row["expiresAt"] == int(ends + 365 * 86400)  # set by the server, not the body
    template = call(mod, "POST /announcements", TEMPLATE)[1]["data"]
    assert "expiresAt" not in template  # templates are kept
    # a new end time moves it
    row = call(mod, "PUT /announcements/{id}", {"actor": ANA, "announcementEndTime": "2998-04-10T17:00"}, row["announcementId"])[1]["data"]
    assert row["expiresAt"] == int(mod.uk_instant("2998-04-10T17:00") + 365 * 86400)
    # past its retention (TTL has not run yet, or the row predates expiresAt): not listed
    table.put_item(Item={"announcementId": "ANR-090", "kind": "ROLLOUT", "status": "SENT", "expiresAt": 1000})
    table.put_item(Item={"announcementId": "ANR-091", "kind": "ROLLOUT", "status": "SENT", "announcementEndTime": "2020-01-01T09:00"})
    ids = [r["announcementId"] for r in call(mod, "GET /announcements", query={"kind": "ROLLOUT"})[1]["data"]]
    assert row["announcementId"] in ids and "ANR-090" not in ids and "ANR-091" not in ids


def test_the_seeded_templates_are_the_six_built_in_ones():
    spec = importlib.util.spec_from_file_location("seed_announcements", BACKEND / "seed-data" / "seed_announcements.py")
    seed = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed)
    rows = seed.template_rows(json.loads(seed.SOURCE.read_text(encoding="utf-8")))
    assert [r["announcementId"] for r in rows] == [f"ANC-00{i}" for i in range(1, 7)]
    assert all(r["kind"] == "TEMPLATE" and r["status"] == "ACTIVE" and r["seed"] is True for r in rows)
    assert all(r["announcementId"] == r["announcementScenarioId"] for r in rows)


def test_the_backfill_sets_the_same_expiry_as_the_api(mod):
    spec = importlib.util.spec_from_file_location("backfill_expiry", BACKEND / "seed-data" / "backfill_announcement_expiry.py")
    backfill = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backfill)
    rows = [
        {"announcementId": "ANR-001", "kind": "ROLLOUT", "announcementEndTime": "2026-02-01T10:00"},
        {"announcementId": "ANR-002", "kind": "ROLLOUT", "createdAt": "2026-01-05T08:00:00Z"},
        {"announcementId": "ANR-003", "kind": "ROLLOUT", "expiresAt": 5, "announcementEndTime": "2026-02-01T10:00"},  # has one
        {"announcementId": "ANC-001", "kind": "TEMPLATE", "createdAt": "2026-01-02T00:00:00Z"},  # kept
        {"announcementId": "ANR-004", "kind": "ROLLOUT", "announcementStartTime": "2026-07-01T09:00"},  # BST
    ]
    assert backfill.RETENTION_DAYS == mod.ANNOUNCEMENT_RETENTION_DAYS
    assert backfill.missing(rows) == [("ANR-001", mod.rollout_expiry(rows[0])), ("ANR-002", mod.rollout_expiry(rows[1])),
                                      ("ANR-004", mod.rollout_expiry(rows[4]))]


def test_the_outcome_says_who_it_reached_read_it_and_finished_its_training(mod, table):
    db = mod.dynamodb
    rec = db.create_table(
        TableName=f"{mod.TABLE_PREFIX}-recipients", BillingMode="PAY_PER_REQUEST",
        KeySchema=[{"AttributeName": "campaignId", "KeyType": "HASH"}, {"AttributeName": "recipientId", "KeyType": "RANGE"}],
        AttributeDefinitions=[{"AttributeName": "campaignId", "AttributeType": "S"}, {"AttributeName": "recipientId", "AttributeType": "S"}])
    ta = db.create_table(
        TableName=f"{mod.TABLE_PREFIX}-training-assignments", BillingMode="PAY_PER_REQUEST",
        KeySchema=[{"AttributeName": "owner", "KeyType": "HASH"}, {"AttributeName": "assignmentId", "KeyType": "RANGE"}],
        AttributeDefinitions=[{"AttributeName": n, "AttributeType": "S"} for n in ("owner", "assignmentId", "TrainingPathID", "assignedAt")],
        GlobalSecondaryIndexes=[{"IndexName": "path-assignedAt-index", "Projection": {"ProjectionType": "ALL"},
                                 "KeySchema": [{"AttributeName": "TrainingPathID", "KeyType": "HASH"},
                                               {"AttributeName": "assignedAt", "KeyType": "RANGE"}]}])
    table.put_item(Item={"announcementId": "ANR-010", "kind": "ROLLOUT", "status": "SENT", "createdBy": ANA,
                         "announcementCampaignTitle": "VPN change", "selectedListName": "Finance", "trainingPathId": "TP-1"})
    rows = [("R1", "ana@x.example", "SENT", "2026-11-20T10:00:00Z"), ("R2", "ben@x.example", "SENT", None),
            ("R3", "cy@x.example", "FAILED", None)]
    for rid, email, sent, ack in rows:
        item = {"campaignId": "ANR-010", "recipientId": rid, "kind": "ANNOUNCEMENT", "recipientEmail": email, "sendStatus": sent,
                "trackingToken": f"tok-{rid}"}
        if ack:
            item["acknowledgedAt"] = ack
        if sent == "FAILED":
            item["failureReason"] = "MessageRejected"
        rec.put_item(Item=item)
    ta.put_item(Item={"owner": "ana@x.example", "assignmentId": "A1", "TrainingPathID": "TP-1", "assignedAt": "x", "status": "COMPLETED"})
    ta.put_item(Item={"owner": "ben@x.example", "assignmentId": "A2", "TrainingPathID": "TP-1", "assignedAt": "y", "status": "IN_PROGRESS"})
    get = lambda q: call(mod, "GET /announcements/{id}/outcome", query=q, row_id="ANR-010")  # noqa: E731
    assert get({"actor": BEN, "role": "Campaign Creator"})[0] == 403  # not hers, not an approver
    status, body = get({"actor": BEN, "role": "Campaign Manager"})
    assert status == 200
    out = body["data"]
    assert out["title"] == "VPN change" and out["listName"] == "Finance" and out["refreshedAt"]
    assert out["totals"] == {"recipients": 3, "sent": 2, "failed": 1, "acknowledged": 1, "trained": 1}
    by = {r["email"]: r for r in out["rows"]}
    assert (by["ana@x.example"]["sent"], by["ana@x.example"]["acknowledged"], by["ana@x.example"]["trained"]) == ("yes", "yes", "yes")
    assert (by["ben@x.example"]["acknowledged"], by["ben@x.example"]["trained"]) == ("no", "no")
    assert by["cy@x.example"]["acknowledged"] == "unknown" and by["cy@x.example"]["failureReason"] == "MessageRejected"
    assert all("trackingToken" not in r for r in out["rows"])  # tokens never leave the server
    # its creator sees it too; with no training linked, trained is unknown
    table.update_item(Key={"announcementId": "ANR-010"}, UpdateExpression="REMOVE trainingPathId")
    out = get({"actor": ANA})[1]["data"]
    assert out["totals"]["trained"] is None and {r["trained"] for r in out["rows"]} == {"unknown"}
    # a template has no outcome
    tid = call(mod, "POST /announcements", TEMPLATE)[1]["data"]["announcementId"]
    assert call(mod, "GET /announcements/{id}/outcome", query={"actor": ANA}, row_id=tid)[0] == 409
