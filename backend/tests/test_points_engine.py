"""Tests for the points-engine Lambda (events stream -> points ledger).

DynamoDB is moto's in-memory fake (mock_aws), so the transaction, its
condition and the key schemas behave as on AWS while nothing leaves the
process -- CI has no AWS credentials or region.
"""
import importlib.util
import os
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError
from moto import mock_aws

REPO = Path(__file__).resolve().parents[2]
MODULE_PATH = REPO / "backend" / "points-engine" / "lambda_function.py"
CTX = SimpleNamespace(aws_request_id="test")
ANA = "ana@example.test"
BEN = "ben@example.test"
RULES = {"Opened": 0, "Clicked": -30, "Compromised": -50, "Reported": 80, "Trained": 30, "Evaluated": 30}


@pytest.fixture(scope="module")
def mod():
    # Set before exec: the module reads TABLE_PREFIX and builds boto3 clients at
    # import time, so both must exist or the import itself raises.
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("points_engine", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_table(db, name, hash_key, range_key=None):
    keys = [{"AttributeName": hash_key, "KeyType": "HASH"}]
    attrs = [{"AttributeName": hash_key, "AttributeType": "S"}]
    if range_key:
        keys.append({"AttributeName": range_key, "KeyType": "RANGE"})
        attrs.append({"AttributeName": range_key, "AttributeType": "S"})
    return db.create_table(
        TableName=name,
        KeySchema=keys,
        AttributeDefinitions=attrs,
        ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
    )


@pytest.fixture
def engine(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name="ap-south-1")
        p = mod.TABLE_PREFIX
        make_table(db, f"{p}-points-ledger", "owner", "entryId")
        recipients = make_table(db, f"{p}-recipients", "campaignId", "recipientId")
        campaigns = make_table(db, f"{p}-campaigns", "campaignId")
        rules = make_table(db, f"{p}-gamification-rules", "EventOperation")
        for op, pts in RULES.items():
            rules.put_item(Item={"EventOperation": op, "PointsAssigned": pts})
        campaigns.put_item(Item={"campaignId": "CMP-1", "campaignTitle": "Payroll Update Notice"})
        campaigns.put_item(Item={"campaignId": "CMP-2", "campaignName": "Mailbox Quota Exceeded"})
        campaigns.put_item(Item={"campaignId": "CMP-T", "campaignTitle": "Dry run", "isTestCampaign": True})
        for cid in ("CMP-1", "CMP-2", "CMP-T"):
            recipients.put_item(Item={"campaignId": cid, "recipientId": "R-ana", "recipientEmail": "Ana@Example.test"})
            recipients.put_item(Item={"campaignId": cid, "recipientId": "R-ben", "recipientEmail": BEN})
        recipients.put_item(Item={"campaignId": "CMP-1", "recipientId": "R-nobody"})
        # Built inside the mock, never against AWS; rules cache starts empty.
        monkeypatch.setattr(mod, "dynamodb", db)
        monkeypatch.setattr(mod, "client", db.meta.client)
        monkeypatch.setattr(mod, "_rules", {"at": 0.0, "points": {}})
        yield SimpleNamespace(mod=mod, ledger=db.Table(f"{p}-points-ledger"), rules=rules, campaigns=campaigns)


_ser = TypeSerializer()
_seq = iter(range(1, 10_000))


def record(event_type, campaign="CMP-1", recipient="R-ana", name="INSERT", at="2026-10-14T09:00:00Z"):
    image = {
        "campaignId": campaign,
        "eventId": f"EVT-{next(_seq)}",
        "recipientId": recipient,
        "eventType": event_type,
        "eventTimestamp": at,
    }
    return {
        "eventName": name,
        "dynamodb": {
            "SequenceNumber": str(next(_seq)),
            "NewImage": {k: _ser.serialize(v) for k, v in image.items()},
        },
    }


def run(env, *records):
    return env.mod.lambda_handler({"Records": list(records)}, CTX)


def rows(env, owner=ANA):
    return {r["entryId"]: r for r in env.ledger.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("owner").eq(owner)
    )["Items"]}


def test_a_click_loses_its_points_and_adds_to_the_total(engine):
    assert run(engine, record("CLICK")) == {"batchItemFailures": []}
    r = rows(engine)
    entry = r["E#CMP-1#Clicked"]
    assert entry["delta"] == -30
    assert entry["campaignName"] == "Payroll Update Notice"
    assert entry["at"] == "2026-10-14T09:00:00Z"
    assert entry["owner"] == ANA, "stored lower-cased"
    total = r["TOTAL"]
    assert (total["points"], total["entries"], total["board"]) == (-30, 1, "GLOBAL")


def test_the_same_action_counts_once_per_campaign(engine):
    run(engine, record("CLICK"), record("CLICK"), record("CLICK"))
    run(engine, record("CLICK"))  # a later batch, or a retried one
    assert rows(engine)["TOTAL"]["points"] == -30
    assert rows(engine)["TOTAL"]["entries"] == 1


def test_different_actions_and_campaigns_each_count(engine):
    run(engine, record("CLICK"), record("REPORT"), record("CLICK", campaign="CMP-2"), record("SUBMIT", campaign="CMP-2"))
    r = rows(engine)
    assert set(r) == {"TOTAL", "E#CMP-1#Clicked", "E#CMP-1#Reported", "E#CMP-2#Clicked", "E#CMP-2#Compromised"}
    assert r["TOTAL"]["points"] == -30 + 80 - 30 - 50
    assert r["E#CMP-2#Clicked"]["campaignName"] == "Mailbox Quota Exceeded", "older rows' campaignName"


def test_people_are_kept_apart(engine):
    run(engine, record("REPORT"), record("CLICK", recipient="R-ben"))
    assert rows(engine)["TOTAL"]["points"] == 80
    assert rows(engine, BEN)["TOTAL"]["points"] == -30


def test_what_never_scores(engine):
    run(
        engine,
        record("CLICK", campaign="CMP-T"),  # a test campaign
        record("OPEN"),  # worth 0 points
        record("WHATEVER"),  # not a scored action
        record("CLICK", recipient="R-nobody"),  # recipient row without an email
        record("CLICK", recipient="R-missing"),  # no recipient row at all
        record("CLICK", campaign="CMP-gone"),  # neither campaign nor recipient rows
        record("CLICK", name="MODIFY"),  # only new rows count
    )
    assert rows(engine) == {}


def test_a_campaign_row_gone_still_scores_the_click(engine):
    engine.campaigns.delete_item(Key={"campaignId": "CMP-2"})
    run(engine, record("CLICK", campaign="CMP-2"))
    r = rows(engine)
    assert r["TOTAL"]["points"] == -30
    assert r["E#CMP-2#Clicked"]["campaignName"] == ""


def test_test_campaign_flag_as_text(engine):
    engine.campaigns.put_item(Item={"campaignId": "CMP-3", "isTestCampaign": "TRUE "})
    run(engine, record("CLICK", campaign="CMP-3"))
    assert rows(engine) == {}


def test_rules_are_read_live_with_a_short_cache(engine, monkeypatch):
    run(engine, record("REPORT"))
    engine.rules.put_item(Item={"EventOperation": "Reported", "PointsAssigned": Decimal("100")})
    run(engine, record("REPORT", campaign="CMP-2"))  # still cached
    assert rows(engine)["TOTAL"]["points"] == 160
    monkeypatch.setattr(engine.mod, "RULES_TTL_SECONDS", -1)
    run(engine, record("REPORT", campaign="CMP-T"))  # test campaign: nothing
    engine.campaigns.put_item(Item={"campaignId": "CMP-4"})
    engine.mod.dynamodb.Table("t-recipients").put_item(
        Item={"campaignId": "CMP-4", "recipientId": "R-ana", "recipientEmail": ANA}
    )
    run(engine, record("REPORT", campaign="CMP-4"))
    assert rows(engine)["TOTAL"]["points"] == 260


def test_a_junk_rule_is_not_scored(engine):
    engine.rules.put_item(Item={"EventOperation": "Clicked", "PointsAssigned": "abc"})
    run(engine, record("CLICK"))
    assert rows(engine) == {}


def test_throttling_fails_only_that_record_for_a_retry(engine, monkeypatch):
    real = engine.mod.client.transact_write_items
    calls = {"n": 0}

    def flaky(**kwargs):
        calls["n"] += 1
        if calls["n"] == 2:
            raise ClientError(
                {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "slow down"}},
                "TransactWriteItems",
            )
        return real(**kwargs)

    monkeypatch.setattr(engine.mod.client, "transact_write_items", flaky)
    first, second, third = record("CLICK"), record("REPORT"), record("CLICK", campaign="CMP-2")
    out = run(engine, first, second, third)
    assert out == {"batchItemFailures": [{"itemIdentifier": second["dynamodb"]["SequenceNumber"]}]}
    assert rows(engine)["TOTAL"]["points"] == -60

    # The stream retries from the failed record: the rest are not counted twice.
    assert run(engine, second, third) == {"batchItemFailures": []}
    assert rows(engine)["TOTAL"]["points"] == -60 + 80


def test_logs_carry_no_email(engine, capsys):
    run(engine, record("CLICK"), record("CLICK"))
    out = capsys.readouterr().out
    assert "ana@" not in out.lower()
    assert '"person": "' in out
