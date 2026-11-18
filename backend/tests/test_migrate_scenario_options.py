"""Tests for seed-data/migrate_scenario_options.py (moto's in-memory DynamoDB; no AWS)."""
import importlib.util
import os
import re
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "backend" / "seed-data" / "migrate_scenario_options.py"
OPTIONS_JS = ROOT / "frontend" / "VShield" / "src" / "services" / "scenarioOptions.js"


@pytest.fixture(scope="module")
def mod():
    spec = importlib.util.spec_from_file_location("migrate_scenario_options", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def table(monkeypatch):
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"):
        monkeypatch.setenv(key, os.environ.get(key, "test"))
    with mock_aws():
        db = boto3.resource("dynamodb", region_name="ap-south-1")
        yield db.create_table(
            TableName="t-campaigns",
            KeySchema=[{"AttributeName": "campaignId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "campaignId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )


def test_every_new_name_is_on_the_new_lists(mod):
    for kind, motivator in mod.OLD_TYPES.values():
        assert kind in mod.EMAIL_TYPES and motivator in mod.MOTIVATORS
    assert set(mod.OLD_AUDIENCES.values()) <= set(mod.AUDIENCES)


@pytest.mark.skipif(not OPTIONS_JS.exists(), reason="scenarioOptions.js arrives with #223")
def test_the_lists_are_the_frontends(mod):
    js = OPTIONS_JS.read_text()

    def labels(name):
        block = re.search(rf"export const {name} = Object\.freeze\(\[(.*?)\]\.map", js, re.S).group(1)
        return tuple(re.findall(r"label: '([^']+)'", block))
    assert labels("EMAIL_TYPES") == mod.EMAIL_TYPES
    assert labels("MOTIVATORS") == mod.MOTIVATORS
    assert labels("TARGET_AUDIENCES") == mod.AUDIENCES


def test_older_motivators_take_their_first_word_that_is_a_motivator_now(mod):
    assert mod.new_motivator("Fear, Feedback, Curiosity") == "Fear"
    assert mod.new_motivator("Urgency / Fear / Security") == "Urgency"
    assert mod.new_motivator("Feedback / Curiosity") == "Curiosity"
    assert mod.new_motivator("Curiosity / Inconvenience") == "Curiosity"
    assert mod.new_motivator("Fear / Compliance") == "Fear"
    assert mod.new_motivator("Urgency / Security / Software Update") == "Urgency"
    assert mod.new_motivator("New") is None  # nothing to map it to: left as it is
    assert mod.new_motivator("Urgency") is None  # already new
    assert mod.new_motivator("") is None and mod.new_motivator(None) is None


def test_changes_for_one_row(mod):
    # a seeded campaign: an old type and no motivator -> both from the type
    assert mod.changes({"campaignType": "Credential theft"}) == {
        "campaignType": "Data Entry", "motivator": "Security / Account Alert"}
    # an old type with a motivator of its own keeps (a mapped) one
    assert mod.changes({"campaignType": "Reward scam", "motivator": "Feedback / Curiosity",
                        "targetAudience": "Office users"}) == {
        "campaignType": "Click", "motivator": "Curiosity", "targetAudience": "Office Employees"}
    # already new, Custom, and words with no mapping: nothing to do
    assert mod.changes({"campaignType": "QR Code", "motivator": "Social", "targetAudience": "HR"}) == {}
    assert mod.changes({"campaignType": "Custom", "motivator": "New", "targetAudience": "Interns"}) == {}


def rows(table):
    return {r["campaignId"]: r for r in table.scan()["Items"]}


def test_dry_run_writes_nothing_and_write_keeps_the_old_values(mod, table):
    table.put_item(Item={"campaignId": "C1", "campaignType": "Travel scam", "campaignTitle": "keep me"})
    table.put_item(Item={"campaignId": "C2", "campaignType": "Click", "motivator": "Fear, Feedback, Curiosity",
                         "targetAudience": "Remote / Hybrid users"})
    table.put_item(Item={"campaignId": "C3", "campaignType": "Multi-Step", "motivator": "Social"})
    before = rows(table)
    planned, written, skipped = mod.migrate(table, "campaignId", write=False)
    assert [p[0] for p in sorted(planned)] == ["C1", "C2"] and written == 0
    assert rows(table) == before

    planned, written, skipped = mod.migrate(table, "campaignId", write=True)
    assert written == 2 and not skipped
    after = rows(table)
    assert after["C1"]["campaignType"] == "Click" and after["C1"]["motivator"] == "Opportunity"
    assert after["C1"]["legacyCampaignType"] == "Travel scam" and "legacyMotivator" not in after["C1"]
    assert after["C1"]["campaignTitle"] == "keep me"
    assert after["C2"]["motivator"] == "Fear" and after["C2"]["legacyMotivator"] == "Fear, Feedback, Curiosity"
    assert after["C2"]["targetAudience"] == "Hybrid Employees"
    assert after["C2"]["legacyTargetAudience"] == "Remote / Hybrid users"
    assert after["C3"] == before["C3"]

    # a second run finds nothing more to do
    planned, written, _ = mod.migrate(table, "campaignId", write=True)
    assert planned == [] and written == 0


def test_a_row_edited_meanwhile_is_left_alone(mod, table, monkeypatch):
    table.put_item(Item={"campaignId": "C1", "campaignType": "Helpdesk impersonation", "motivator": "Urgency"})
    real = mod.scan_all

    def read_then_edit(t):
        found = real(t)
        t.update_item(Key={"campaignId": "C1"}, UpdateExpression="SET campaignType = :t",
                      ExpressionAttributeValues={":t": "QR Code"})
        return found

    monkeypatch.setattr(mod, "scan_all", read_then_edit)
    planned, written, skipped = mod.migrate(table, "campaignId", write=True)
    assert written == 0 and skipped == ["C1"]
    row = rows(table)["C1"]
    assert row["campaignType"] == "QR Code" and "legacyCampaignType" not in row
