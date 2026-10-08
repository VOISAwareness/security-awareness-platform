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
