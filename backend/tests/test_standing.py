"""Tests for reference-api's GET /standing and GET /levels, and for the level
table matching the front end's (frontend/VShield/src/services/levels.js).

DynamoDB is moto's in-memory fake (mock_aws); nothing leaves the process.
"""
import importlib.util
import json
import os
import re
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from botocore.exceptions import ClientError
from moto import mock_aws

REPO = Path(__file__).resolve().parents[2]
MODULE_PATH = REPO / "backend" / "reference-api" / "lambda_function.py"
FRONT_LEVELS = REPO / "frontend" / "VShield" / "src" / "services" / "levels.js"
ANA = "ana@example.test"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api_standing", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def api(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name="ap-south-1")
        ledger = db.create_table(
            TableName=f"{mod.TABLE_PREFIX}-points-ledger",
            KeySchema=[
                {"AttributeName": "owner", "KeyType": "HASH"},
                {"AttributeName": "entryId", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "owner", "AttributeType": "S"},
                {"AttributeName": "entryId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        monkeypatch.setattr(mod, "dynamodb", db)
        yield SimpleNamespace(mod=mod, ledger=ledger)


def call(mod, route, viewer=None):
    event = {"routeKey": route}
    if viewer is not None:
        event["queryStringParameters"] = {"viewer": viewer}
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


def entry(owner, campaign, rule, delta, at, name=""):
    return {
        "owner": owner, "entryId": f"E#{campaign}#{rule}", "rule": rule, "delta": delta,
        "campaignId": campaign, "campaignName": name, "at": at,
    }


# --- the level table ----------------------------------------------------------


def test_bands_join_up_and_cover_every_total(mod):
    assert len(mod.LEVELS) == 24
    for prev, cur in zip(mod.LEVELS, mod.LEVELS[1:], strict=False):
        assert cur["min"] == prev["max"]
    cases = {
        0: "L1G1", 49: "L1G1", 50: "L1G2", 150: "L2G1", 749: "L3G3", 750: "L4G1", 1299: "L4G3",
        1300: "L5G1", 4449: "L7G2", 4450: "L7G3", 99999: "L7G3",
        -1: "L0", -100: "L0", -101: "LN1", -200: "LN1", -201: "LN2", -99999: "LN2",
    }
    for points, level_id in cases.items():
        assert mod.level_for(points)["id"] == level_id, points


def test_progress(mod):
    assert mod.progress_for(205) == {"nextLevelId": "L2G3", "toNext": 45, "pct": 10}
    assert mod.progress_for(-30) == {"nextLevelId": "L1G1", "toNext": 30, "pct": 70}
    assert mod.progress_for(-350) == {"nextLevelId": "LN1", "toNext": 150, "pct": 25}
    assert mod.progress_for(5000) == {"nextLevelId": None, "toNext": 0, "pct": 100}


def test_the_level_table_matches_the_front_end():
    """One table, two copies: this fails if either side changes alone."""
    text = FRONT_LEVELS.read_text()
    bands = re.findall(r"\['(L\w+)', (null|\d), (null|-?\d+), (null|-?\d+)\]", text)
    families = dict(
        re.findall(r"(L\w+): \{ level: -?\d+, name: '([^']+)', label: '[^']+', risk: '[^']+'", text)
    )
    assert len(bands) == 24

    def num(v):
        return None if v == "null" else int(v)

    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api_levels", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert [(f, num(g), num(lo), num(hi)) for f, g, lo, hi in bands] == list(module.LEVEL_BANDS)
    assert {k: v[1] for k, v in module.LEVEL_FAMILIES.items()} == families


# --- GET /levels --------------------------------------------------------------


def test_get_levels(api):
    status, body = call(api.mod, "GET /levels")
    assert status == 200
    assert body["count"] == 24
    first, last = body["data"][0], body["data"][-1]
    assert (first["id"], first["min"], first["max"], first["name"]) == ("LN2", None, -200, "Critical Risk")
    assert (last["id"], last["min"], last["max"], last["risk"]) == ("L7G3", 4450, None, "Trusted")


# --- GET /standing ------------------------------------------------------------


def test_standing_needs_a_viewer(api):
    assert call(api.mod, "GET /standing")[0] == 400
    assert call(api.mod, "GET /standing", viewer="  ")[0] == 400


def test_someone_new_is_a_new_joiner_on_zero(api):
    status, body = call(api.mod, "GET /standing", viewer=ANA)
    assert status == 200
    d = body["data"]
    assert (d["known"], d["points"], d["levelId"], d["bestLevelId"], d["history"]) == (False, 0, "L1G1", "L1G1", [])
    assert (d["nextLevelId"], d["toNext"]) == ("L1G2", 50)


def test_standing_from_the_ledger(api):
    api.ledger.put_item(Item=entry(ANA, "CMP-1", "Reported", 80, "2026-10-01T09:00:00Z", "Payroll"))
    api.ledger.put_item(Item=entry(ANA, "CMP-2", "Reported", 80, "2026-10-03T09:00:00Z"))
    api.ledger.put_item(Item=entry(ANA, "CMP-3", "Reported", 80, "2026-10-05T09:00:00Z"))
    api.ledger.put_item(Item=entry(ANA, "CMP-3", "Clicked", -30, "2026-10-07T09:00:00Z"))
    api.ledger.put_item(Item=entry(ANA, "CMP-4", "Compromised", -50, "2026-10-09T09:00:00Z"))
    api.ledger.put_item(Item={"owner": ANA, "entryId": "TOTAL", "points": 160, "entries": 5, "updatedAt": "u"})
    api.ledger.put_item(Item=entry("ben@example.test", "CMP-1", "Reported", 80, "2026-10-01T09:00:00Z"))

    status, body = call(api.mod, "GET /standing", viewer=" ANA@example.test ")
    assert status == 200
    d = body["data"]
    assert d["email"] == ANA
    assert (d["known"], d["points"], d["levelId"]) == (True, 160, "L2G1")
    assert d["bestLevelId"] == "L2G2", "the highest running total was 240"
    assert (d["nextLevelId"], d["toNext"]) == ("L2G2", 40)
    assert [h["rule"] for h in d["history"]] == ["Compromised", "Clicked", "Reported", "Reported", "Reported"]
    assert d["history"][-1] == {
        "rule": "Reported", "delta": 80, "campaignId": "CMP-1", "campaignName": "Payroll", "at": "2026-10-01T09:00:00Z",
    }
    assert d["updatedAt"] == "u"


def test_history_is_the_latest_ten(api):
    for i in range(14):
        api.ledger.put_item(Item=entry(ANA, f"CMP-{i:02d}", "Reported", 80, f"2026-10-{i + 1:02d}T09:00:00Z"))
    d = call(api.mod, "GET /standing", viewer=ANA)[1]["data"]
    assert len(d["history"]) == 10
    assert d["history"][0]["campaignId"] == "CMP-13"
    assert d["points"] == 14 * 80, "no TOTAL row yet: the entries are summed"


def test_below_zero(api):
    api.ledger.put_item(Item=entry(ANA, "CMP-1", "Compromised", -50, "2026-10-01T09:00:00Z"))
    api.ledger.put_item(Item=entry(ANA, "CMP-2", "Compromised", -50, "2026-10-02T09:00:00Z"))
    api.ledger.put_item(Item=entry(ANA, "CMP-3", "Clicked", -30, "2026-10-03T09:00:00Z"))
    api.ledger.put_item(Item={"owner": ANA, "entryId": "TOTAL", "points": -130})
    d = call(api.mod, "GET /standing", viewer=ANA)[1]["data"]
    assert (d["levelId"], d["bestLevelId"], d["nextLevelId"], d["toNext"]) == ("LN1", "L1G1", "L0", 30)


def test_a_throttled_ledger_answers_busy(api, monkeypatch):
    def slow(**_):
        raise ClientError({"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "x"}}, "Query")

    monkeypatch.setattr(api.mod, "table", lambda name: SimpleNamespace(query=slow))
    status, body = call(api.mod, "GET /standing", viewer=ANA)
    assert status == 503
    assert body["error"]["code"] == "BUSY"
