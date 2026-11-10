"""Tests for seed-data/set_legacy_roles.py (moto's in-memory DynamoDB; no AWS)."""
import importlib.util
import os
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

MODULE_PATH = Path(__file__).resolve().parents[1] / "seed-data" / "set_legacy_roles.py"


@pytest.fixture(scope="module")
def mod():
    spec = importlib.util.spec_from_file_location("set_legacy_roles", MODULE_PATH)
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
            TableName="users",
            KeySchema=[{"AttributeName": "UserID", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "UserID", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )


def test_roles_are_set_on_rows_that_exist_and_nothing_else_changes(mod, table):
    table.put_item(Item={"UserID": "VSLD-000006", "UserName": "Someone", "Department": "Cyber Security"})
    table.put_item(Item={"UserID": "VSLD-000050", "UserName": "No role"})
    changed, missing = mod.set_roles(table, write=True)
    assert changed == ["VSLD-000006"] and len(missing) == len(mod.ROLES) - 1
    assert table.get_item(Key={"UserID": "VSLD-000006"})["Item"] == {
        "UserID": "VSLD-000006", "UserName": "Someone", "Department": "Cyber Security", "role": "Admin",
    }
    assert "role" not in table.get_item(Key={"UserID": "VSLD-000050"})["Item"]
    assert table.scan()["Count"] == 2  # no row created for a missing person


def test_a_dry_run_writes_nothing(mod, capsys):
    mod.main([])
    out = capsys.readouterr().out
    assert "VSLD-000006: Admin" in out and "Dry run: nothing written" in out


def test_only_the_apps_roles_are_used(mod):
    assert set(mod.ROLES.values()) == {
        "Admin", "Campaign Manager", "Campaign Creator", "Gamification Engine Manager", "GMT",
    }
