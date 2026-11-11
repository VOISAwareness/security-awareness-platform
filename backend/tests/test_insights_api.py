"""Tests for insights-api: Insights' payload from the fake company's rows (no AWS calls)."""
import datetime as dt
import importlib.util
import json
import os
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
TODAY = dt.date(2026, 11, 10)


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeTable:
    def __init__(self, rows):
        self.rows = rows

    def scan(self, **_):
        return {"Items": self.rows}

    def query(self, **kwargs):
        assert kwargs["IndexName"] == "board-points-index"
        return {"Items": [r for r in self.rows if r.get("board") == "GLOBAL"]}


@pytest.fixture(scope="module")
def company():
    seed = load("seed_company_for_insights", BACKEND / "seed-data" / "seed_company.py")
    return seed.build(TODAY, people_count=160)


@pytest.fixture(scope="module")
def mod(company):
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    m = load("insights_api", BACKEND / "insights-api" / "lambda_function.py")
    m.users_table = FakeTable(company["users"])
    m.campaigns_table = FakeTable(company["campaigns"] + [
        {"campaignId": "CAMP-TEST", "status": "SENT", "isTestCampaign": True, "campaignTitle": "Test send"}])
    m.recipients_table = FakeTable(company["recipients"] + [
        {"campaignId": "CAMP-TEST", "recipientId": "R1", "recipientEmail": company["users"][0]["UserEMailID"],
         "sendStatus": "SENT", "sentAt": "2026-11-09T09:00:00Z", "clickedAt": "2026-11-09T09:01:00Z"}])
    m.assignments_table = FakeTable(company["training-assignments"])
    m.paths_table = FakeTable([{"TrainingPathID": "TP-00001", "TrainingPathName": "Anti-Phishing Path"}])
    m.ledger_table = FakeTable(company["points-ledger"])
    return m


@pytest.fixture(scope="module")
def data(mod):
    return mod.build(dt.datetime(2026, 11, 10, 18, 0, tzinfo=dt.UTC))


def test_role_gate(mod):
    res = mod.lambda_handler({"routeKey": "GET /insights", "queryStringParameters": {"role": "Regular User"}}, None)
    assert res["statusCode"] == 403


def test_reports_match_the_recipient_rows(data, company):
    sent = [c for c in company["campaigns"] if c["status"] == "SENT"]
    assert len(data["items"]) == len(sent)  # the test campaign is left out
    by_id = {c["campaignId"]: c for c in sent}
    for x in data["items"]:
        r, counts = x["report"], by_id[x["campaign"]["id"]]["counts"]
        for key in ("sent", "delivered", "opened", "clicked", "compromised", "reported"):
            assert r[key] == counts.get(key, 0), key
        # the department rows add up to the report
        for key in ("delivered", "clicked", "reported", "compromised"):
            assert sum(d[key] for d in r["departments"]) == r[key]
        assert r["trained"] <= r["clicked"]
        assert x["campaign"]["type"] in {"Data Entry", "Click", "Credential theft", "Helpdesk impersonation",
                                         "Reward scam", "Travel scam"}
        if r["reported"]:
            t = r["timing"]
            assert 0 <= t["firstReport"] <= t["medianReport"]


def test_nothing_identifying_or_typed_leaves(data):
    text = json.dumps(data, default=str)
    at = text.find("@")
    assert at == -1, text[max(0, at - 80):at + 40]  # no email addresses
    keys = set()

    def walk(v):
        if isinstance(v, dict):
            keys.update(v)
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
    walk(data)
    assert not keys & {"trackingToken", "tokenFingerprint", "recipientEmail", "email", "UserEMailID", "password"}


def test_org_steps(data):
    org = data["org"]
    assert len(org) == 24
    assert [s["to"] for s in org] == sorted(s["to"] for s in org)
    assert org[-1]["to"] == data["asOf"]
    for s in org:
        assert sum(s["tiers"].values()) == s["people"] == 160
        c = s["cohorts"]
        assert c["trained"] + c["untrained"] == s["people"]
        assert c["assigned"] + c["voluntary"] == c["trained"]
        assert c["assignedClicks"] + c["voluntaryClicks"] == c["trainedClicks"]
        assert [d["index"] for d in s["departments"]] == list(range(len(s["departments"])))
        assert sum(d["people"] for d in s["departments"]) == s["people"]
        t = s["training"]
        assert t["passed"] == t["completed"] <= t["started"] <= t["assigned"]
    # the newest step has seen campaigns, so not everyone is moderate
    assert org[-1]["tiers"]["low"] > 0
    assert any(s["training"]["assigned"] for s in org)


def test_people_rows(data):
    people = data["people"]
    assert len(people["rows"]) == 160 and len(people["months"]) == 6
    assert people["months"][-1]["to"] == data["asOf"]
    newest = data["org"][-1]
    for level in ("Low", "Moderate", "High", "Critical"):
        assert sum(r["level"] == level for r in people["rows"]) == newest["tiers"][level.lower()]
    row = people["rows"][0]
    assert set(row) >= {"id", "name", "initials", "department", "levels", "level", "records", "emails",
                        "clicked", "reported", "gave", "step", "programme", "overdue", "quizFails", "drivers"}
    assert row["step"] in ("Not started", "Started", "Completed", "Passed")
    trained = newest["cohorts"]
    assert sum(r["trained"] == "Assigned" for r in people["rows"]) == trained["assigned"]
    assert sum(r["trained"] == "None" for r in people["rows"]) == trained["untrained"]
    names = {x["campaign"]["name"] for x in data["items"]}
    for r in people["rows"]:
        assert r["emails"] == len(r["records"])
        for i, *flags in r["records"]:
            assert people["campaigns"][i]["name"] in names
            assert all(f in (0, 1) for f in flags)


def test_programmes(data):
    names = [p["program"] for p in data["programmes"]]
    assert "Anti-Phishing Path" in names  # named from training-paths, else by id
    for p in data["programmes"]:
        assert 0 <= p["completion"] <= 100
        assert p["pass"] is None or 0 <= p["pass"] <= 100


def board_call(mod, role="Campaign Manager", viewer=""):
    return mod.lambda_handler({"routeKey": "GET /insights/board",
                               "queryStringParameters": {"role": role, "viewer": viewer}}, None)


def test_board(mod, company):
    assert board_call(mod, role="Regular User")["statusCode"] == 403
    viewer = company["users"][5]["UserEMailID"]
    res = board_call(mod, viewer=viewer.upper())
    assert res["statusCode"] == 200
    board = json.loads(res["body"])["data"]
    assert "@" not in res["body"]  # no email addresses
    assert board["you"] == company["users"][5]["UserID"]
    sent = [c for c in company["campaigns"] if c["status"] == "SENT"]
    assert len(board["campaigns"]) == len(sent) and all(c["endsAt"] for c in board["campaigns"])
    totals = {r["owner"]: r["points"] for r in company["points-ledger"] if r["entryId"] == "TOTAL"}
    by_key = {u["UserID"]: u["UserEMailID"] for u in company["users"]}
    for p in board["people"]:
        assert p["points"] == totals.get(by_key[p["key"]], 0)
    # every delivered email is one event; clicks match the reports
    events = [e for p in board["people"] for e in p["events"]]
    for i, c in enumerate(board["campaigns"]):
        mine = [e for e in events if e[0] == i]
        counts = next(x["counts"] for x in sent if x["campaignId"] == c["id"])
        assert len(mine) == counts["delivered"]
        assert sum(e[2] for e in mine) == counts.get("clicked", 0)
        assert sum(e[3] for e in mine) == counts.get("reported", 0)


def test_handler_caches(mod):
    q = {"routeKey": "GET /insights", "queryStringParameters": {"role": "Admin"}}
    first = mod.lambda_handler(q, None)
    assert first["statusCode"] == 200
    mod.users_table = FakeTable([])  # a second call inside the cache window reads nothing
    assert mod.lambda_handler(q, None)["body"] == first["body"]
