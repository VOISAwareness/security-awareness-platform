"""Unit tests for campaign-scheduler (in-memory table and Lambda client, no AWS calls)."""
import importlib.util
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "campaign-scheduler" / "lambda_function.py"
CONTEXT = SimpleNamespace(aws_request_id="test-request")
NOW = datetime(2026, 11, 5, 9, 0, tzinfo=UTC)


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("CAMPAIGNS_TABLE", "t-campaigns")
    os.environ.setdefault("EMAIL_SENDER_FUNCTION", "t-email-sender")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("campaign_scheduler", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeTable:
    """Pages of APPROVED campaigns, as the status index returns them."""

    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    def query(self, **kwargs):
        self.calls.append(kwargs)
        page = len(self.calls) - 1
        out = {"Items": self.pages[page]}
        if page + 1 < len(self.pages):
            out["LastEvaluatedKey"] = {"page": page + 1}
        return out


class FakeLambda:
    def __init__(self):
        self.invoked = []

    def invoke(self, **kwargs):
        self.invoked.append(kwargs)
        return {"StatusCode": 202}


def run(mod, monkeypatch, pages):
    table, client = FakeTable(pages), FakeLambda()
    monkeypatch.setattr(mod, "campaigns_table", table)
    monkeypatch.setattr(mod, "lambda_client", client)
    monkeypatch.setattr(mod, "utc_now", lambda: NOW)
    return mod.lambda_handler({}, CONTEXT), table, client


def test_sends_what_is_due_and_waits_for_the_rest(mod, monkeypatch):
    result, table, client = run(mod, monkeypatch, [[
        {"campaignId": "due", "status": "APPROVED", "startAt": "2026-11-05T08:59:00Z"},
        {"campaignId": "now", "status": "APPROVED", "startAt": "2026-11-05T09:00:00.000Z"},
        {"campaignId": "later", "status": "APPROVED", "startAt": "2026-11-05T09:01:00Z"},
    ]])
    assert result["sent"] == ["due", "now"]
    assert result["waiting"] == 1
    assert table.calls[0]["IndexName"] == "status-index"
    sent = [json.loads(c["Payload"]) for c in client.invoked]
    assert sent == [{"campaignId": "due", "source": "campaign-scheduler"}, {"campaignId": "now", "source": "campaign-scheduler"}]
    assert all(c["InvocationType"] == "Event" and c["FunctionName"] == "t-email-sender" for c in client.invoked)


def test_an_old_start_is_missed_not_sent(mod, monkeypatch):
    result, _, client = run(mod, monkeypatch, [[
        {"campaignId": "old", "status": "APPROVED", "startAt": "2026-11-05T07:59:00Z"},
        {"campaignId": "late-ok", "status": "APPROVED", "startAt": "2026-11-05T08:01:00Z"},
    ]])
    assert result["missed"] == ["old"]
    assert result["sent"] == ["late-ok"]
    assert len(client.invoked) == 1


def test_reads_every_page(mod, monkeypatch):
    result, table, _ = run(mod, monkeypatch, [
        [{"campaignId": "a", "startAt": "2026-11-05T08:30:00Z"}],
        [{"campaignId": "b", "startAt": "2026-11-05T08:40:00Z"}],
    ])
    assert result["sent"] == ["a", "b"]
    assert table.calls[1]["ExclusiveStartKey"] == {"page": 1}


def test_a_campaign_without_an_instant_is_read_in_ist(mod, monkeypatch):
    # 14:25 IST is 08:55 UTC: due. 14:31 IST is 09:01 UTC: not yet.
    result, _, _ = run(mod, monkeypatch, [[
        {"campaignId": "ist-due", "startTime": "2026-11-05T14:25"},
        {"campaignId": "ist-later", "startTime": "2026-11-05T14:31"},
        {"campaignId": "none"},
    ]])
    assert result["sent"] == ["ist-due"]
    assert result["waiting"] == 1


def test_nothing_approved_sends_nothing(mod, monkeypatch):
    result, _, client = run(mod, monkeypatch, [[]])
    assert result == {"sent": [], "missed": [], "waiting": 0}
    assert client.invoked == []
