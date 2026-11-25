"""Tests for reference-api's GET /users (the people directory): one cached,
trimmed read of the users table, and the login picker's ?role= list.

DynamoDB is moto's in-memory fake (mock_aws); nothing leaves the process.
"""
import importlib.util
import json
import os
from pathlib import Path

import boto3
import pytest
from moto import mock_aws

REPO = Path(__file__).resolve().parents[2]
MODULE_PATH = REPO / "backend" / "reference-api" / "lambda_function.py"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api_users", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def users(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name="ap-south-1")
        monkeypatch.setattr(mod, "dynamodb", db)
        monkeypatch.setattr(mod, "_users_cache", {"at": 0.0, "rows": None})
        monkeypatch.setattr(mod, "_people_cache", {"at": 0.0, "people": None})
        tbl = db.create_table(
            TableName=f"{mod.TABLE_PREFIX}-users",
            KeySchema=[{"AttributeName": "UserID", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "UserID", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        base = {"Department": "IT", "Country": "UK", "managerEmail": "boss@x.test", "jobTitle": "Analyst",
                "location": "Leeds", "seed": True, "source": "seed", "GamificationPoint": 10}
        tbl.put_item(Item={**base, "UserID": "U1", "UserName": "Ana", "UserEMailID": "ana@x.test", "role": "Admin",
                           "active": True, "HookRate%": 12})
        tbl.put_item(Item={**base, "UserID": "U2", "UserName": "Bo", "UserEMailID": "bo@x.test", "role": "Regular User"})
        tbl.put_item(Item={**base, "UserID": "U3", "UserName": "Cy", "UserEMailID": "cy@x.test", "role": "Admin",
                           "active": False})
        yield tbl


def get(mod, query=None):
    res = mod.lambda_handler({"routeKey": "GET /users", "queryStringParameters": query}, None)
    assert res["statusCode"] == 200, res["body"]
    return res, json.loads(res["body"])["data"]


def test_everyone_with_only_the_columns_the_app_uses(mod, users):
    res, rows = get(mod)
    assert sorted(r["UserID"] for r in rows) == ["U1", "U2", "U3"]
    for r in rows:
        assert set(r) <= set(mod.USER_FIELDS)
        for hidden in ("managerEmail", "jobTitle", "location", "seed", "source", "GamificationPoint"):
            assert hidden not in r
    ana = next(r for r in rows if r["UserID"] == "U1")
    assert ana["HookRate%"] == 12 and ana["Department"] == "IT"
    assert res["headers"]["Cache-Control"].endswith("s-maxage=300")  # CloudFront keeps it, as before


def test_the_login_picker_gets_one_role_with_just_the_profile(mod, users):
    _, admins = get(mod, {"role": "Admin"})
    assert [r["UserID"] for r in admins] == ["U1"]  # Cy is inactive
    assert set(admins[0]) == set(mod.LOGIN_FIELDS)
    _, everyone = get(mod, {"role": "Regular User"})
    assert sorted(r["UserID"] for r in everyone) == ["U1", "U2"]  # anyone can sign in as a Regular User
    _, nobody = get(mod, {"role": "GMT"})
    assert nobody == []


def test_the_table_is_read_once_per_window(mod, users, monkeypatch):
    get(mod)
    users.put_item(Item={"UserID": "U4", "UserName": "Di", "UserEMailID": "di@x.test"})
    _, rows = get(mod, {"role": "Regular User"})
    assert "U4" not in [r["UserID"] for r in rows]  # still the cached read
    assert mod.people_by_email()["ana@x.test"] == ("Ana", "IT")  # the leaderboard's names share it
    monkeypatch.setattr(mod, "PEOPLE_TTL_SECONDS", -1)
    _, rows = get(mod)
    assert "U4" in [r["UserID"] for r in rows]
