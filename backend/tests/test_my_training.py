"""reference-api: My Training and the Training report (moto's in-memory
DynamoDB; nothing leaves the process)."""
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
ANA = "ana@x.example"
QUIZ = {
    "TrainingQuizID": "TQ-1", "TrainingQuizName": "Q", "TrainingCompletionThreshold": 80,
    "QuizData": {f"Question0{i}": {"question": f"q{i}", "Answer": "optionB"} for i in range(1, 6)},
}


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", REGION)
    spec = importlib.util.spec_from_file_location("reference_api_my_training", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make(db, name, keys, indexes=()):
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
             "Projection": {"ProjectionType": "ALL"}} for n, ks in indexes]
    return db.create_table(**spec)


@pytest.fixture
def env(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name=REGION)
        p = mod.TABLE_PREFIX
        t = SimpleNamespace(
            assignments=make(db, f"{p}-training-assignments", [("owner", "HASH"), ("assignmentId", "RANGE")],
                             [("path-assignedAt-index", [("TrainingPathID", "HASH"), ("assignedAt", "RANGE")])]),
            paths=make(db, f"{p}-training-paths", [("TrainingPathID", "HASH")]),
            quizzes=make(db, f"{p}-training-quizzes", [("TrainingQuizID", "HASH")]),
            campaigns=make(db, f"{p}-campaigns", [("campaignId", "HASH")]),
            users=make(db, f"{p}-users", [("UserID", "HASH")], [("email-index", [("UserEMailID", "HASH")])]),
            events=make(db, f"{p}-events", [("campaignId", "HASH"), ("eventId", "RANGE")]),
        )
        t.paths.put_item(Item={"TrainingPathID": "TP-1", "TrainingPathName": "Basics", "TrainingVideoAttached": ["TV-1", "TV-2"],
                               "TrainingQuizAttached": ["TQ-1"], "TrainingCertificateAttached": ["TC-1"]})
        t.quizzes.put_item(Item=QUIZ)
        t.users.put_item(Item={"UserID": "U1", "UserEMailID": ANA, "UserName": "Ana Lopez", "Department": "AIDA", "Country": "Spain"})
        t.campaigns.put_item(Item={"campaignId": "CMP-1", "campaignTitle": "Payroll update"})
        monkeypatch.setattr(mod, "dynamodb", db)
        monkeypatch.setattr(mod, "_people_cache", {"at": 0.0, "people": None})
        yield t


def call(mod, route, body=None, query=None):
    event = {"routeKey": route, "queryStringParameters": query, "body": json.dumps(body) if body is not None else None}
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


def answers(right):
    return {f"Question0{i}": ("optionB" if i <= right else "optionA") for i in range(1, 6)}


def test_enrol_watch_fail_then_pass(mod, env):
    status, body = call(mod, "POST /my-training/enrol", {"viewer": "Ana@X.example", "TrainingPathID": "TP-1"})
    assert status == 201
    row = body["data"]
    assert (row["owner"], row["source"], row["status"], row["department"]) == (ANA, "VOLUNTARY", "ASSIGNED", "AIDA")
    assert row["TrainingPathName"] == "Basics" and row["TrainingQuizID"] == "TQ-1"
    # enrolling again returns the same, open assignment
    assert call(mod, "POST /my-training/enrol", {"viewer": ANA, "TrainingPathID": "TP-1"})[1]["data"]["assignmentId"] == row["assignmentId"]

    assert call(mod, "POST /my-training/progress", {"viewer": ANA, "TrainingPathID": "TP-1", "videoId": "TV-9"})[0] == 400
    for _ in range(2):
        status, body = call(mod, "POST /my-training/progress", {"viewer": ANA, "TrainingPathID": "TP-1", "videoId": "TV-1"})
    assert status == 200 and body["data"]["status"] == "IN_PROGRESS" and body["data"]["videosWatched"] == ["TV-1"]

    status, body = call(mod, "POST /my-training/quiz", {"viewer": ANA, "TrainingPathID": "TP-1", "answers": answers(3)})
    assert status == 200
    assert body["result"] == {"score": 60, "correct": 3, "total": 5, "passMark": 80, "passed": False, "alreadyPassed": False}
    assert body["data"]["status"] == "COMPLETED" and body["data"]["quizPassed"] is False and "certificateId" not in body["data"]

    status, body = call(mod, "POST /my-training/quiz", {"viewer": ANA, "TrainingPathID": "TP-1", "answers": answers(4)})
    assert body["result"]["passed"] is True and body["data"]["quizScore"] == 80
    assert body["data"]["attemptCount"] == 2 and body["data"]["certificateId"] == "TC-1"

    # a later, worse attempt does not undo the pass
    body = call(mod, "POST /my-training/quiz", {"viewer": ANA, "TrainingPathID": "TP-1", "answers": answers(0)})[1]
    assert body["result"]["alreadyPassed"] is True and body["data"]["quizScore"] == 80 and body["data"]["quizPassed"] is True

    status, body = call(mod, "GET /my-training", query={"viewer": ANA})
    assert status == 200 and len(body["data"]) == 1
    assert env.events.scan()["Count"] == 0  # voluntary training is not a campaign's


def test_campaign_training_records_trained_and_evaluated_once(mod, env):
    env.assignments.put_item(Item={"owner": ANA, "assignmentId": "A#2026-11-01T09:00:00Z#TP-1", "TrainingPathID": "TP-1",
                                   "source": "ASSIGNED", "campaignId": "CMP-1", "recipientId": "R-1",
                                   "assignedAt": "2026-11-01T09:00:00Z", "status": "ASSIGNED"})
    call(mod, "POST /my-training/quiz", {"viewer": ANA, "TrainingPathID": "TP-1", "answers": answers(5)})
    call(mod, "POST /my-training/quiz", {"viewer": ANA, "TrainingPathID": "TP-1", "answers": answers(5)})
    kinds = sorted(e["eventType"] for e in env.events.scan()["Items"])
    assert kinds == ["EVALUATED", "TRAINED"]
    row = call(mod, "GET /my-training", query={"viewer": ANA})[1]["data"][0]
    assert row["campaignTitle"] == "Payroll update"


def test_what_is_refused(mod, env):
    assert call(mod, "GET /my-training", query={})[0] == 400
    assert call(mod, "POST /my-training/enrol", {"TrainingPathID": "TP-1"})[0] == 400
    assert call(mod, "POST /my-training/enrol", {"viewer": ANA})[0] == 400
    assert call(mod, "POST /my-training/enrol", {"viewer": ANA, "TrainingPathID": "TP-9"})[0] == 404
    assert call(mod, "POST /my-training/quiz", {"viewer": ANA, "TrainingPathID": "TP-1", "answers": {}})[0] == 404  # not enrolled


def test_the_report_lists_everyone_with_names(mod, env):
    call(mod, "POST /my-training/enrol", {"viewer": ANA, "TrainingPathID": "TP-1"})
    call(mod, "POST /my-training/enrol", {"viewer": "ben@x.example", "TrainingPathID": "TP-1"})
    status, body = call(mod, "GET /training/assignments", query={"path": "TP-1"})
    assert status == 200 and {r["owner"] for r in body["data"]} == {ANA, "ben@x.example"}
    assert {r["UserName"] for r in body["data"]} == {"Ana Lopez", ""}
    assert call(mod, "GET /training/assignments")[1]["count"] == 2


def test_score_quiz(mod):
    assert mod.score_quiz(QUIZ, answers(5)) == (100, 5, 5)
    assert mod.score_quiz(QUIZ, None) == (0, 0, 5)
    assert mod.score_quiz({"QuizData": {}}, {}) == (0, 0, 0)
