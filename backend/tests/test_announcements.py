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
    ends = mod.instant("2998-03-10T17:00")
    assert row["expiresAt"] == int(ends + 365 * 86400)  # set by the server, not the body
    template = call(mod, "POST /announcements", TEMPLATE)[1]["data"]
    assert "expiresAt" not in template  # templates are kept
    # a new end time moves it
    row = call(mod, "PUT /announcements/{id}", {"actor": ANA, "announcementEndTime": "2998-04-10T17:00"}, row["announcementId"])[1]["data"]
    assert row["expiresAt"] == int(mod.instant("2998-04-10T17:00") + 365 * 86400)
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
    ]
    assert backfill.RETENTION_DAYS == mod.ANNOUNCEMENT_RETENTION_DAYS
    assert backfill.missing(rows) == [("ANR-001", mod.rollout_expiry(rows[0])), ("ANR-002", mod.rollout_expiry(rows[1]))]
