"""Unit tests for reference-api pure helpers (no AWS calls).

Only module-level helpers are exercised. lambda_handler is never called, so
nothing here touches DynamoDB or S3 -- CI has no AWS credentials or region.
"""
import importlib.util
import os
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "reference-api" / "lambda_function.py"


@pytest.fixture(scope="module")
def mod():
    # Set before exec: the module reads TABLE_PREFIX and builds boto3 clients at
    # import time, so both must exist or the import itself raises.
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# --- next_sequence_id ---------------------------------------------------


def test_next_sequence_id_starts_at_one_when_empty(mod):
    assert mod.next_sequence_id([], "scenarioId", "SC") == "SC-001"


def test_next_sequence_id_continues_from_highest(mod):
    rows = [{"scenarioId": "SC-001"}, {"scenarioId": "SC-006"}, {"scenarioId": "SC-003"}]
    assert mod.next_sequence_id(rows, "scenarioId", "SC") == "SC-007"


def test_next_sequence_id_fills_past_gaps_not_into_them(mod):
    """A deleted SC-002 must not be reused -- ids stay monotonic."""
    rows = [{"scenarioId": "SC-001"}, {"scenarioId": "SC-003"}]
    assert mod.next_sequence_id(rows, "scenarioId", "SC") == "SC-004"


def test_next_sequence_id_ignores_rows_that_do_not_match(mod):
    """Hand-authored ids must not break the sequence or crash on int()."""
    rows = [
        {"scenarioId": "SC-002"},
        {"scenarioId": "custom-scenario"},
        {"scenarioId": ""},
        {},
        {"scenarioId": "SC-01a"},
        {"scenarioId": "LP-009"},
    ]
    assert mod.next_sequence_id(rows, "scenarioId", "SC") == "SC-003"


def test_next_sequence_id_pads_to_three_but_does_not_truncate(mod):
    assert mod.next_sequence_id([{"x": "SC-008"}], "x", "SC") == "SC-009"
    assert mod.next_sequence_id([{"x": "SC-1204"}], "x", "SC") == "SC-1205"


def test_next_sequence_id_is_shared_by_landing_pages(mod):
    """The landing-pages POST relies on the same helper with its own prefix."""
    rows = [{"LandingPageID": "LP-002"}, {"LandingPageID": "SC-099"}]
    assert mod.next_sequence_id(rows, "LandingPageID", "LP") == "LP-003"


# --- safe_name / cover_image_key ---------------------------------------


def test_cover_image_key_cannot_escape_its_prefix(mod):
    """The scenario id is typed by the author, so it must never shape the key.
    Separators are stripped, which is what confines the object -- dots survive
    but are inert in an S3 key, which is an opaque string, not a path."""
    key = mod.cover_image_key("../../etc", "../../../passwd")
    assert key.startswith("uploads/scenario-covers/")
    assert key.count("/") == 3, "user input must not introduce path segments"


def test_cover_image_key_replaces_unsafe_characters(mod):
    key = mod.cover_image_key("SC-001", "my cover (final).png")
    assert key == "uploads/scenario-covers/SC-001/my_cover__final_.png"


def test_cover_image_key_keeps_the_extension(mod):
    assert mod.cover_image_key("SC-1", "a.jpeg").endswith(".jpeg")


def test_safe_name_handles_non_strings(mod):
    assert mod.safe_name(42) == "42"


# --- size guard ---------------------------------------------------------


def test_too_large_allows_a_normal_scenario(mod):
    assert mod.too_large({"scenarioId": "SC-001", "emailBody": "<p>hi</p>"}) == 0


def test_too_large_reports_size_when_over_the_cap(mod):
    oversize = mod.too_large({"emailBody": "x" * (mod.MAX_ITEM_BYTES + 1)})
    assert oversize > mod.MAX_ITEM_BYTES


def test_too_large_leaves_headroom_under_dynamodb_limit(mod):
    """The cap must sit below DynamoDB's hard 400 KB, not at it."""
    assert mod.MAX_ITEM_BYTES < 400 * 1024


# --- cover content types ------------------------------------------------


def test_cover_content_types_are_images_only(mod):
    assert "text/html" not in mod.COVER_CONTENT_TYPES
    assert "application/octet-stream" not in mod.COVER_CONTENT_TYPES
    assert "image/png" in mod.COVER_CONTENT_TYPES


# --- parse_points (PUT /gamification-rules/{id}) -------------------------


@pytest.mark.parametrize("value, expected", [(80, 80), (-30, -30), ("45", 45), (" -50 ", -50), (0, 0), (30.0, 30)])
def test_parse_points_accepts_whole_numbers(mod, value, expected):
    assert mod.parse_points(value) == (expected, None)


@pytest.mark.parametrize("value", [None, "", "ten", 12.5, True, "NaN", "Infinity", [], {}])
def test_parse_points_rejects_non_whole_numbers(mod, value):
    points, problem = mod.parse_points(value)
    assert points is None
    assert "whole number" in problem


def test_parse_points_enforces_the_limit(mod):
    assert mod.parse_points(mod.POINTS_LIMIT) == (mod.POINTS_LIMIT, None)
    points, problem = mod.parse_points(mod.POINTS_LIMIT + 1)
    assert points is None and "between" in problem


def _call(mod, monkeypatch, fake, rule, body):
    import json
    from types import SimpleNamespace

    monkeypatch.setattr(mod, "table", lambda name: fake)
    event = {
        "routeKey": "PUT /gamification-rules/{id}",
        "pathParameters": {"id": rule},
        "body": json.dumps(body),
    }
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


class _FakeRules:
    def __init__(self, existing):
        self.existing = existing
        self.calls = []

    def update_item(self, **kwargs):
        from botocore.exceptions import ClientError

        self.calls.append(kwargs)
        if kwargs["Key"]["EventOperation"] not in self.existing:
            raise ClientError({"Error": {"Code": "ConditionalCheckFailedException"}}, "UpdateItem")
        values = kwargs["ExpressionAttributeValues"]
        return {
            "Attributes": {
                "EventOperation": kwargs["Key"]["EventOperation"],
                "PointsAssigned": values[":points"],
                "ModifiedBy": values[":by"],
                "LastModifiedOn": values[":on"],
            }
        }


def test_update_rule_saves_points_and_who_changed_them(mod, monkeypatch):
    fake = _FakeRules({"Clicked"})
    status, body = _call(mod, monkeypatch, fake, "Clicked", {"PointsAssigned": -40, "ModifiedBy": "a@x.com"})
    assert status == 200
    assert body["data"]["PointsAssigned"] == -40
    assert body["data"]["ModifiedBy"] == "a@x.com"
    assert fake.calls[0]["ConditionExpression"] == "attribute_exists(EventOperation)"


def test_update_unknown_rule_is_404_not_a_new_rule(mod, monkeypatch):
    status, body = _call(mod, monkeypatch, _FakeRules({"Clicked"}), "Bogus", {"PointsAssigned": 5})
    assert status == 404
    assert "Bogus" in body["error"]["message"]


def test_update_rejects_bad_points_before_writing(mod, monkeypatch):
    fake = _FakeRules({"Clicked"})
    status, _ = _call(mod, monkeypatch, fake, "Clicked", {"PointsAssigned": "lots"})
    assert status == 400
    assert fake.calls == []


# --- Insights targets (GET/PUT /insights-targets) -------------------------


def test_parse_targets_keeps_valid_edges_as_decimals(mod):
    from decimal import Decimal

    targets, problem = mod.parse_targets(
        {"hookRate": {"target": 0.05, "atRisk": 0.1}, "reportRate": {"target": "0.5", "atRisk": 0.3}, "riskScore": {"target": 20, "atRisk": 35}}
    )
    assert problem is None
    assert targets["hookRate"] == {"target": Decimal("0.05"), "atRisk": Decimal("0.1")}
    assert targets["reportRate"] == {"target": Decimal("0.5"), "atRisk": Decimal("0.3")}
    assert targets["riskScore"]["atRisk"] == Decimal("35")


@pytest.mark.parametrize(
    "raw, says",
    [
        (None, "at least one"),
        ({}, "at least one"),
        ([], "at least one"),
        ({"openRate": {"target": 0.1, "atRisk": 0.2}}, "not a measure"),
        ({"hookRate": 0.05}, "needs a target"),
        ({"hookRate": {"target": 0.05}}, "numbers from"),
        ({"hookRate": {"target": True, "atRisk": 0.1}}, "numbers from"),
        ({"hookRate": {"target": "NaN", "atRisk": 0.1}}, "numbers from"),
        ({"hookRate": {"target": 5, "atRisk": 10}}, "numbers from"),  # rates are fractions
        ({"riskScore": {"target": -1, "atRisk": 35}}, "numbers from"),
        ({"hookRate": {"target": 0.1, "atRisk": 0.05}}, "below the at-risk edge"),
        ({"hookRate": {"target": 0.1, "atRisk": 0.1}}, "below the at-risk edge"),
        ({"reportRate": {"target": 0.3, "atRisk": 0.5}}, "above the at-risk edge"),
    ],
)
def test_parse_targets_refuses_what_cannot_be_a_target(mod, raw, says):
    targets, problem = mod.parse_targets(raw)
    assert targets is None
    assert says in problem


class _FakeSettings:
    def __init__(self, item=None, fail=None):
        self.item = item
        self.fail = fail
        self.puts = []

    def get_item(self, **kwargs):
        assert kwargs["Key"] == {"settingId": "insights-targets"}
        return {"Item": self.item} if self.item else {}

    def put_item(self, **kwargs):
        from botocore.exceptions import ClientError

        self.puts.append(kwargs)
        if self.fail:
            raise ClientError({"Error": {"Code": self.fail}}, "PutItem")
        self.item = kwargs["Item"]


def _targets(mod, monkeypatch, fake, method, body=None):
    import json
    from types import SimpleNamespace

    monkeypatch.setattr(mod, "table", lambda name: fake if name == "settings" else None)
    event = {"routeKey": f"{method} /insights-targets", "body": json.dumps(body) if body is not None else None}
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


ADMIN_PUT = {"role": "Admin", "modifiedBy": "a@x.com", "version": 0, "targets": {"hookRate": {"target": 0.04, "atRisk": 0.08}}}


def test_get_targets_before_any_are_set(mod, monkeypatch):
    status, body = _targets(mod, monkeypatch, _FakeSettings(), "GET")
    assert status == 200
    assert body["data"] == {"targets": {}, "version": 0, "modifiedBy": None, "modifiedAt": None}


def test_get_targets_returns_what_is_stored_as_numbers(mod, monkeypatch):
    from decimal import Decimal

    item = {"settingId": "insights-targets", "version": 3, "modifiedBy": "a@x.com", "modifiedAt": "2026-10-30T10:00:00+00:00",
            "targets": {"riskScore": {"target": Decimal("18"), "atRisk": Decimal("30")}, "hookRate": {"target": Decimal("0.04"), "atRisk": Decimal("0.08")}}}
    status, body = _targets(mod, monkeypatch, _FakeSettings(item), "GET")
    assert status == 200
    assert body["data"]["version"] == 3
    assert body["data"]["targets"] == {"riskScore": {"target": 18, "atRisk": 30}, "hookRate": {"target": 0.04, "atRisk": 0.08}}


def test_only_an_admin_can_change_the_targets(mod, monkeypatch):
    fake = _FakeSettings()
    for role in (None, "User", "admin"):
        status, body = _targets(mod, monkeypatch, fake, "PUT", {**ADMIN_PUT, "role": role})
        assert status == 403
    assert fake.puts == []


def test_bad_targets_or_version_are_refused_before_writing(mod, monkeypatch):
    fake = _FakeSettings()
    status, _ = _targets(mod, monkeypatch, fake, "PUT", {**ADMIN_PUT, "targets": {"hookRate": {"target": 0.2, "atRisk": 0.1}}})
    assert status == 400
    for version in (None, -1, "1", True, 1.5):
        status, body = _targets(mod, monkeypatch, fake, "PUT", {**ADMIN_PUT, "version": version})
        assert status == 400 and "version" in body["error"]["message"]
    assert fake.puts == []


def test_a_body_that_is_not_an_object_is_400(mod, monkeypatch):
    import json
    from types import SimpleNamespace

    fake = _FakeSettings()
    monkeypatch.setattr(mod, "table", lambda name: fake)
    for raw in ("not json", "[]", '"Admin"'):
        resp = mod.lambda_handler({"routeKey": "PUT /insights-targets", "body": raw}, SimpleNamespace(aws_request_id="t"))
        assert resp["statusCode"] == 400, raw
        assert "JSON object" in json.loads(resp["body"])["error"]["message"]
    assert fake.puts == []


def test_first_change_creates_version_one_only_if_none_exists(mod, monkeypatch):
    fake = _FakeSettings()
    status, body = _targets(mod, monkeypatch, fake, "PUT", ADMIN_PUT)
    assert status == 200
    assert body["data"]["version"] == 1
    assert body["data"]["targets"] == {"hookRate": {"target": 0.04, "atRisk": 0.08}}
    assert body["data"]["modifiedBy"] == "a@x.com"
    assert fake.puts[0]["ConditionExpression"] == "attribute_not_exists(settingId)"
    assert fake.puts[0]["Item"]["settingId"] == "insights-targets"


def test_a_later_change_must_name_the_version_it_read(mod, monkeypatch):
    fake = _FakeSettings({"settingId": "insights-targets", "version": 4, "targets": {}})
    status, body = _targets(mod, monkeypatch, fake, "PUT", {**ADMIN_PUT, "version": 4})
    assert status == 200 and body["data"]["version"] == 5
    assert fake.puts[0]["ConditionExpression"] == "#v = :v"
    assert fake.puts[0]["ExpressionAttributeNames"] == {"#v": "version"}
    assert fake.puts[0]["ExpressionAttributeValues"] == {":v": 4}


def test_a_stale_change_is_409_not_a_silent_overwrite(mod, monkeypatch):
    fake = _FakeSettings(fail="ConditionalCheckFailedException")
    status, body = _targets(mod, monkeypatch, fake, "PUT", {**ADMIN_PUT, "version": 2})
    assert status == 409
    assert body["error"]["code"] == "STALE"


def test_a_throttled_settings_table_is_503(mod, monkeypatch):
    fake = _FakeSettings(fail="ProvisionedThroughputExceededException")
    status, body = _targets(mod, monkeypatch, fake, "PUT", ADMIN_PUT)
    assert status == 503
    assert body["error"]["code"] == "BUSY"


def test_targets_round_trip_on_dynamodb_with_its_conditions(mod, monkeypatch):
    """moto's in-memory DynamoDB: the conditions and number types behave as on AWS."""
    import boto3
    from moto import mock_aws

    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        db = boto3.resource("dynamodb", region_name="ap-south-1")
        db.create_table(
            TableName=f"{mod.TABLE_PREFIX}-settings",
            KeySchema=[{"AttributeName": "settingId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "settingId", "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 1, "WriteCapacityUnits": 1},
        )
        monkeypatch.setattr(mod, "dynamodb", db)

        def put(body):
            return _targets_on_db(mod, "PUT", body)


        assert _targets_on_db(mod, "GET")[1]["data"]["version"] == 0
        assert put(ADMIN_PUT)[0] == 200
        # a second first change (version 0) would overwrite the first: refused
        assert put(ADMIN_PUT)[0] == 409
        status, body = put({**ADMIN_PUT, "version": 1, "targets": {"riskScore": {"target": 18, "atRisk": 30}}})
        assert status == 200 and body["data"]["version"] == 2
        # a change from version 1 again is stale now
        assert put({**ADMIN_PUT, "version": 1})[0] == 409
        status, body = _targets_on_db(mod, "GET")
        assert body["data"]["version"] == 2
        assert body["data"]["targets"] == {"riskScore": {"target": 18, "atRisk": 30}}
        assert body["data"]["modifiedBy"] == "a@x.com"


def _targets_on_db(mod, method, body=None):
    import json
    from types import SimpleNamespace

    event = {"routeKey": f"{method} /insights-targets", "body": json.dumps(body) if body is not None else None}
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])
