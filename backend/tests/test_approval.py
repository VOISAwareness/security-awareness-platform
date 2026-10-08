"""Unit tests for the approval workflow Lambda (in-memory table, no AWS calls)."""
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "approval" / "lambda_function.py"
CONTEXT = SimpleNamespace(aws_request_id="test-request")


class ConditionalCheckFailed(Exception):
    pass


class FakeTable:
    """Just enough of a boto3 Table for the handler: get_item and update_item."""

    def __init__(self, item):
        self.item = item
        self.updates = []
        self.meta = SimpleNamespace(
            client=SimpleNamespace(
                exceptions=SimpleNamespace(
                    ConditionalCheckFailedException=ConditionalCheckFailed
                )
            )
        )

    def get_item(self, Key):
        if self.item and self.item["campaignId"] == Key["campaignId"]:
            return {"Item": dict(self.item)}
        return {}

    def update_item(self, **kwargs):
        self.updates.append(kwargs)
        values = kwargs["ExpressionAttributeValues"]
        # DynamoDB rejects values the expression never references.
        for placeholder in values:
            assert placeholder in kwargs["UpdateExpression"] or placeholder in kwargs[
                "ConditionExpression"
            ], f"unused value {placeholder}"
        return {"Attributes": {**self.item, "status": values[":newStatus"]}}


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("CAMPAIGNS_TABLE", "t-campaigns")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("approval", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def call(mod, monkeypatch, item, action, body):
    table = FakeTable(item)
    monkeypatch.setattr(mod, "campaigns_table", table)
    event = {
        "routeKey": f"POST /campaigns/{{campaignId}}/{action}",
        "pathParameters": {"campaignId": "CMP-1"},
        "body": json.dumps(body),
    }
    response = mod.lambda_handler(event, CONTEXT)
    return response["statusCode"], json.loads(response["body"]), table


def pending(**extra):
    return {"campaignId": "CMP-1", "status": "PENDING_APPROVAL", **extra}


def test_identify_action_covers_every_route(mod):
    for action in ("submit", "approve", "reject", "withdraw"):
        event = {"routeKey": f"POST /campaigns/{{campaignId}}/{action}"}
        assert mod.identify_action(event) == action.upper()


def test_plain_reject_needs_no_reason(mod, monkeypatch):
    status, _, table = call(mod, monkeypatch, pending(), "reject", {"actor": "m@x.com"})
    assert status == 200
    values = table.updates[0]["ExpressionAttributeValues"]
    assert values[":newStatus"] == "REJECTED"
    assert values[":notify"] is False


def test_reject_with_notification_requires_message(mod, monkeypatch):
    status, body, table = call(
        mod, monkeypatch, pending(), "reject", {"actor": "m@x.com", "notify": True}
    )
    assert status == 400
    assert "notification" in body["message"]
    assert table.updates == []


def test_reject_with_notification_flags_changes_requested(mod, monkeypatch):
    status, _, table = call(
        mod,
        monkeypatch,
        pending(),
        "reject",
        {"actor": "m@x.com", "notify": True, "comments": "Fix the subject line"},
    )
    assert status == 200
    values = table.updates[0]["ExpressionAttributeValues"]
    assert values[":notify"] is True
    assert values[":comments"] == "Fix the subject line"


def test_notify_must_be_a_real_boolean(mod, monkeypatch):
    """A stray truthy string must not silently turn a plain reject into a notify."""
    status, _, table = call(
        mod, monkeypatch, pending(), "reject", {"actor": "m@x.com", "notify": "yes"}
    )
    assert status == 200
    assert table.updates[0]["ExpressionAttributeValues"][":notify"] is False


def test_creator_can_withdraw_to_draft(mod, monkeypatch):
    status, body, table = call(
        mod,
        monkeypatch,
        pending(createdBy="Sarah.Jenkins@x.com"),
        "withdraw",
        {"actor": "sarah.jenkins@x.com"},
    )
    assert status == 200
    assert body["currentStatus"] == "DRAFT"
    assert "withdrawnBy" in table.updates[0]["UpdateExpression"]


def test_only_the_creator_can_withdraw(mod, monkeypatch):
    status, _, table = call(
        mod,
        monkeypatch,
        pending(createdBy="sarah.jenkins@x.com"),
        "withdraw",
        {"actor": "manager@x.com"},
    )
    assert status == 403
    assert table.updates == []


def test_withdraw_requires_a_pending_campaign(mod, monkeypatch):
    status, _, _ = call(
        mod,
        monkeypatch,
        {"campaignId": "CMP-1", "status": "APPROVED"},
        "withdraw",
        {"actor": "sarah.jenkins@x.com"},
    )
    assert status == 409


def test_approve_still_works(mod, monkeypatch):
    status, body, _ = call(mod, monkeypatch, pending(), "approve", {"actor": "m@x.com"})
    assert status == 200
    assert body["currentStatus"] == "APPROVED"
