"""Tests for reference-api's GET /notifications and POST /notifications/read
(the bell in the top bar).

DynamoDB is moto's in-memory fake (mock_aws); nothing leaves the process.
"""
import importlib.util
import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

REPO = Path(__file__).resolve().parents[2]
MODULE_PATH = REPO / "backend" / "reference-api" / "lambda_function.py"
ANA = "ana@example.test"  # campaign creator
MO = "mo@example.test"  # campaign manager (approver)
NOW = datetime.now(UTC)


def iso(delta=timedelta()):
    return (NOW + delta).strftime("%Y-%m-%dT%H:%M:%SZ")


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api_notifications", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_table(db, name, keys, attrs=(), indexes=()):
    kwargs = {
        "TableName": name,
        "KeySchema": [{"AttributeName": k, "KeyType": t} for k, t in keys],
        "AttributeDefinitions": [{"AttributeName": a, "AttributeType": "S"} for a, _ in keys]
        + [{"AttributeName": a, "AttributeType": t} for a, t in attrs],
        "BillingMode": "PAY_PER_REQUEST",
    }
    if indexes:
        kwargs["GlobalSecondaryIndexes"] = [
            {"IndexName": n, "KeySchema": [{"AttributeName": k, "KeyType": t} for k, t in ks], "Projection": {"ProjectionType": "ALL"}}
            for n, ks in indexes
        ]
    return db.create_table(**kwargs)


@pytest.fixture
def db(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    p = mod.TABLE_PREFIX
    with mock_aws():
        res = boto3.resource("dynamodb", region_name="ap-south-1")
        monkeypatch.setattr(mod, "dynamodb", res, raising=False)
        mod._notify_cache.clear()
        mod._board_cache.update(at=0.0, totals=None)
        mod._people_cache.update(at=0.0, people=None)
        tables = {
            "campaigns": make_table(res, f"{p}-campaigns", [("campaignId", "HASH")]),
            "paths": make_table(res, f"{p}-training-paths", [("TrainingPathID", "HASH")]),
            "assignments": make_table(res, f"{p}-training-assignments", [("owner", "HASH"), ("assignmentId", "RANGE")]),
            "announcements": make_table(res, f"{p}-announcements", [("announcementId", "HASH")]),
            "recipients": make_table(
                res, f"{p}-recipients", [("campaignId", "HASH"), ("recipientId", "RANGE")],
                attrs=[("recipientEmail", "S"), ("createdAt", "S")],
                indexes=[("recipientEmail-index", [("recipientEmail", "HASH"), ("createdAt", "RANGE")])],
            ),
            "ledger": make_table(
                res, f"{p}-points-ledger", [("owner", "HASH"), ("entryId", "RANGE")],
                attrs=[("board", "S"), ("points", "N")],
                indexes=[("board-points-index", [("board", "HASH"), ("points", "RANGE")])],
            ),
            "users": make_table(res, f"{p}-users", [("UserID", "HASH")]),
            "reads": make_table(res, f"{p}-notification-reads", [("owner", "HASH")]),
        }
        tables["users"].put_item(Item={"UserID": "U1", "UserEMailID": MO, "UserName": "Mo Khan"})
        tables["users"].put_item(Item={"UserID": "U2", "UserEMailID": ANA, "UserName": "Ana Lopez"})
        yield tables


def get(mod, viewer, role=""):
    res = mod.lambda_handler({"routeKey": "GET /notifications", "queryStringParameters": {"viewer": viewer, "role": role}}, None)
    assert res["statusCode"] == 200, res["body"]
    return json.loads(res["body"])["data"]


def mark(mod, viewer, ids):
    return mod.lambda_handler({"routeKey": "POST /notifications/read", "body": json.dumps({"viewer": viewer, "ids": ids})}, None)


def types(view):
    return [n["type"] for n in view["items"]]


def test_campaigns_for_their_creator_and_for_approvers(mod, db):
    c = db["campaigns"]
    c.put_item(Item={"campaignId": "C1", "campaignTitle": "Payroll", "status": "SENT", "createdBy": ANA,
                     "approvedAt": iso(-timedelta(hours=5)), "approvedBy": MO, "sentAt": iso(-timedelta(hours=1)),
                     "recipientCount": 12, "failedCount": 1})
    c.put_item(Item={"campaignId": "C2", "campaignTitle": "Gift card", "status": "REJECTED", "createdBy": ANA,
                     "rejectedAt": iso(-timedelta(hours=2)), "rejectedBy": MO, "rejectionComments": "Fix the subject",
                     "changesRequested": True, "wizardStep": 3})
    c.put_item(Item={"campaignId": "C3", "campaignTitle": "Wire", "status": "PENDING_APPROVAL", "createdBy": ANA,
                     "submittedAt": iso(-timedelta(minutes=10))})
    c.put_item(Item={"campaignId": "C4", "campaignTitle": "Mine", "status": "PENDING_APPROVAL", "createdBy": MO,
                     "submittedAt": iso(-timedelta(minutes=5))})
    c.put_item(Item={"campaignId": "C5", "campaignTitle": "Broken", "status": "SEND_FAILED", "createdBy": ANA,
                     "failedAt": iso(-timedelta(minutes=30)), "failureReason": "No recipients"})
    c.put_item(Item={"campaignId": "C6", "campaignTitle": "Held", "status": "ON_HOLD", "createdBy": ANA,
                     "heldAt": iso(-timedelta(minutes=40)), "heldBy": ANA})  # her own action: not notified
    c.put_item(Item={"campaignId": "C7", "campaignTitle": "Soon", "status": "APPROVED", "createdBy": ANA,
                     "approvedAt": iso(-timedelta(days=2)), "approvedBy": MO, "startAt": iso(timedelta(hours=6))})

    ana = get(mod, ANA, "Campaign Creator")
    by_type = {n["type"]: n for n in ana["items"]}
    assert set(types(ana)) == {"campaign.approved", "campaign.sent", "campaign.changes_requested",
                               "campaign.failed", "campaign.starts_soon"}
    assert by_type["campaign.sent"]["detail"] == "Sent to 12 people, 1 failed"
    assert by_type["campaign.changes_requested"]["title"] == "Gift card needs changes"
    assert by_type["campaign.changes_requested"]["detail"] == "“Fix the subject” · Mo Khan"
    assert by_type["campaign.changes_requested"]["link"] == {"to": "draft", "campaignId": "C2", "wizardStep": 3}
    assert by_type["campaign.failed"]["detail"] == "No recipients"
    assert ana["unread"] == len(ana["items"])
    assert [n["at"] for n in ana["items"]] == sorted((n["at"] for n in ana["items"]), reverse=True)

    # an approver sees others' campaigns waiting, not their own
    mo = get(mod, MO, "Campaign Manager")
    pending = [n for n in mo["items"] if n["type"] == "campaign.pending_approval"]
    assert [n["title"] for n in pending] == ["Wire needs your approval"]
    assert pending[0]["detail"] == "Submitted by Ana Lopez"
    # a role that can't approve sees none
    assert "campaign.pending_approval" not in types(get(mod, MO, "Regular User"))


def test_training_assignments(mod, db):
    db["paths"].put_item(Item={"TrainingPathID": "TP1", "TrainingPathName": "Spot the phish"})
    a = db["assignments"]
    a.put_item(Item={"owner": ANA, "assignmentId": "A#1#TP1", "TrainingPathID": "TP1", "source": "ASSIGNED",
                     "assignedAt": iso(-timedelta(days=12)), "dueAt": iso(timedelta(days=2)), "status": "ASSIGNED"})
    a.put_item(Item={"owner": ANA, "assignmentId": "A#2#TP2", "TrainingPathID": "TP2", "source": "VOLUNTARY",
                     "assignedAt": iso(-timedelta(days=20)), "dueAt": iso(-timedelta(days=1)), "status": "IN_PROGRESS"})
    a.put_item(Item={"owner": ANA, "assignmentId": "A#3#TP1", "TrainingPathID": "TP1", "source": "VOLUNTARY",
                     "assignedAt": iso(-timedelta(days=3)), "dueAt": iso(timedelta(days=11)), "status": "COMPLETED",
                     "certificateIssuedAt": iso(-timedelta(hours=3))})
    view = get(mod, ANA)
    titles = {n["type"]: n["title"] for n in view["items"]}
    assert set(types(view)) == {"training.assigned", "training.due_soon", "training.overdue", "training.certificate"}
    assert titles["training.due_soon"] == "Spot the phish is due in 2 days"
    assert titles["training.overdue"] == "TP2 is overdue"  # a path that no longer exists keeps its id
    assert titles["training.certificate"] == "You earned a certificate for Spot the phish"


def test_announcements_and_never_a_phishing_campaign(mod, db):
    db["announcements"].put_item(Item={"announcementId": "ANR-001", "kind": "ROLLOUT", "status": "SENT", "createdBy": MO,
                                       "announcementCampaignTitle": "Holiday scams", "approvedAt": iso(-timedelta(days=1))})
    db["announcements"].put_item(Item={"announcementId": "ANR-002", "kind": "ROLLOUT", "status": "PENDING_APPROVAL",
                                       "createdBy": ANA, "announcementCampaignTitle": "MFA", "createdAt": iso(-timedelta(hours=1))})
    r = db["recipients"]
    r.put_item(Item={"campaignId": "ANR-001", "recipientId": "R1", "recipientEmail": ANA, "createdAt": iso(-timedelta(hours=20))})
    # a phishing simulation sent to her: must never show
    db["campaigns"].put_item(Item={"campaignId": "C9", "campaignTitle": "Fake invoice", "status": "SENT", "createdBy": MO,
                                   "sentAt": iso(-timedelta(hours=2))})
    r.put_item(Item={"campaignId": "C9", "recipientId": "R2", "recipientEmail": ANA, "createdAt": iso(-timedelta(hours=2))})

    ana = get(mod, ANA)
    assert types(ana) == ["announcement.published"]
    assert ana["items"][0]["title"] == "New announcement: Holiday scams"
    assert "Fake invoice" not in json.dumps(ana)
    mo = get(mod, MO, "Admin")
    assert [n["title"] for n in mo["items"] if n["type"] == "announcement.pending_approval"] == ["Announcement MFA needs your approval"]


def test_badges_and_levels(mod, db):
    led = db["ledger"]
    for i in range(10):
        led.put_item(Item={"owner": ANA, "entryId": f"E#C{i}#Reported", "rule": "Reported", "delta": 80,
                           "at": iso(-timedelta(days=9 - i))})
    led.put_item(Item={"owner": ANA, "entryId": "TOTAL", "points": 800, "board": "GLOBAL", "updatedAt": iso()})
    view = get(mod, ANA)
    badges = [n["title"] for n in view["items"] if n["type"] == "achievement.badge"]
    assert set(badges) == {"You earned the First Report badge", "You earned the Sharp Eye badge",
                           "You earned the Safe Handler badge"}
    levels = [n["title"] for n in view["items"] if n["type"] == "achievement.level_up"]
    assert levels[0] == "You reached Phish Catcher I"  # 800 points, the newest level first
    assert "You reached Aware User I" in levels


def test_read_one_then_all(mod, db):
    db["campaigns"].put_item(Item={"campaignId": "C1", "campaignTitle": "A", "status": "SENT", "createdBy": ANA,
                                   "sentAt": iso(-timedelta(hours=1)), "recipientCount": 3})
    db["campaigns"].put_item(Item={"campaignId": "C2", "campaignTitle": "B", "status": "SENT", "createdBy": ANA,
                                   "sentAt": iso(-timedelta(hours=2)), "recipientCount": 3})
    first = get(mod, ANA)
    assert first["unread"] == 2
    assert mark(mod, ANA, [first["items"][0]["id"]])["statusCode"] == 200
    mod._notify_cache.clear()
    after = get(mod, ANA)
    assert [n["read"] for n in after["items"]] == [True, False]
    assert after["unread"] == 1
    assert mark(mod, ANA, "all")["statusCode"] == 200
    assert get(mod, ANA)["unread"] == 0
    # what happens after "Mark all read" is new again
    db["campaigns"].put_item(Item={"campaignId": "C3", "campaignTitle": "C", "status": "SENT", "createdBy": ANA,
                                   "sentAt": iso(timedelta(seconds=30)), "recipientCount": 3})
    mod._notify_cache.clear()
    assert get(mod, ANA)["unread"] == 1


def test_read_validation(mod, db):
    assert mark(mod, "", "all")["statusCode"] == 400
    assert mark(mod, ANA, [])["statusCode"] == 400
    assert mark(mod, ANA, [1, 2])["statusCode"] == 400
    assert mark(mod, ANA, ["x"] * 101)["statusCode"] == 400
    res = mod.lambda_handler({"routeKey": "GET /notifications", "queryStringParameters": {}}, None)
    assert res["statusCode"] == 400


def test_old_ones_are_left_out_and_the_list_is_capped(mod, db):
    c = db["campaigns"]
    c.put_item(Item={"campaignId": "OLD", "campaignTitle": "Old", "status": "SENT", "createdBy": ANA,
                     "sentAt": iso(-timedelta(days=40)), "recipientCount": 1})
    for i in range(60):
        c.put_item(Item={"campaignId": f"N{i:02}", "campaignTitle": f"N{i}", "status": "SENT", "createdBy": ANA,
                         "sentAt": iso(-timedelta(minutes=i + 1)), "recipientCount": 1})
    view = get(mod, ANA)
    assert len(view["items"]) == mod.NOTIFY_MAX
    assert "Old was sent" not in [n["title"] for n in view["items"]]
    assert len({n["id"] for n in view["items"]}) == mod.NOTIFY_MAX


def test_responses_are_never_shared_cached(mod, db):
    res = mod.lambda_handler({"routeKey": "GET /notifications", "queryStringParameters": {"viewer": ANA}}, None)
    assert res["headers"].get("Cache-Control", "no-store") == "no-store"


def test_a_training_path_status_change_is_stamped(mod, db):
    put = lambda body: mod.lambda_handler(  # noqa: E731
        {"routeKey": "PUT /training/paths/{id}", "pathParameters": {"id": "TP9"}, "body": json.dumps(body)}, None)
    assert put({"TrainingPathName": "New path", "status": "Pending", "createdBy": ANA})["statusCode"] == 200
    first = db["paths"].get_item(Key={"TrainingPathID": "TP9"})["Item"]["statusChangedAt"]
    # an edit that keeps the status keeps the time, whatever the client sends
    assert put({"TrainingPathName": "New path!", "status": "Pending", "createdBy": ANA, "statusChangedAt": "2000-01-01T00:00:00Z"})["statusCode"] == 200
    assert db["paths"].get_item(Key={"TrainingPathID": "TP9"})["Item"]["statusChangedAt"] == first
    mo = get(mod, MO, "Admin")
    assert [n["title"] for n in mo["items"]] == ["Training path New path! needs your approval"]
    assert put({"TrainingPathName": "New path!", "status": "Rejected", "createdBy": ANA, "approvedBy": MO,
                "rejectionMessage": "Too long"})["statusCode"] == 200
    mod._notify_cache.clear()
    ana = get(mod, ANA)
    assert [(n["type"], n["detail"]) for n in ana["items"]] == [("training_path.rejected", "“Too long” · Mo Khan")]
