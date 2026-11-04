"""tracking: a click is recorded, then the campaign's landing page is shown.
Every table is a stand-in; nothing here calls AWS."""
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from botocore.exceptions import ClientError

MODULE_PATH = Path(__file__).resolve().parents[1] / "tracking" / "lambda_function.py"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    os.environ.setdefault("RECIPIENTS_TABLE", "proj-recipients")
    os.environ.setdefault("EVENTS_TABLE", "proj-events")
    os.environ.setdefault("TRACKING_TOKEN_INDEX", "trackingToken-index")
    spec = importlib.util.spec_from_file_location("tracking", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _Table:
    def __init__(self, rows=None, key=None, fail=False):
        self.rows, self.key, self.fail = rows or {}, key, fail
        self.puts, self.updates = [], []

    def get_item(self, Key):
        if self.fail:
            raise ClientError({"Error": {"Code": "AccessDeniedException", "Message": "no"}}, "GetItem")
        return {"Item": self.rows[Key[self.key]]} if Key[self.key] in self.rows else {}

    def query(self, **kw):
        return {"Items": list(self.rows.values())}

    def put_item(self, Item):
        self.puts.append(Item)

    def update_item(self, **kw):
        self.updates.append(kw)


LP = '<div style="background:#0d58be"><h1>Oops! You have been phished</h1></div>'


def _click(mod, monkeypatch, campaign, pages=None, fail=False):
    monkeypatch.setattr(mod, "recipients_table", _Table({"r": {"campaignId": "CMP-1", "recipientId": "R-1"}}))
    events = _Table()
    monkeypatch.setattr(mod, "events_table", events)
    monkeypatch.setattr(mod, "campaigns_table", _Table({"CMP-1": campaign} if campaign else {}, "campaignId", fail))
    monkeypatch.setattr(mod, "landing_pages_table", _Table(pages or {}, "LandingPageID"))
    resp = mod.lambda_handler({"pathParameters": {"trackingToken": "tok"}}, SimpleNamespace(aws_request_id="t"))
    return resp, events


def test_tables_default_next_to_the_recipients_table(mod):
    prefix = mod.RECIPIENTS_TABLE.rsplit("-", 1)[0]
    assert mod.CAMPAIGNS_TABLE == f"{prefix}-campaigns"
    assert mod.LANDING_PAGES_TABLE == f"{prefix}-landing-pages"
    assert mod._sibling_table("x") == f"{prefix}-x"


def test_the_chosen_catalogue_page_is_shown_after_the_click_is_recorded(mod, monkeypatch):
    resp, events = _click(mod, monkeypatch, {"campaignId": "CMP-1", "landingPageId": "LP-001"}, {"LP-001": {"LandingPageContent": LP}})
    assert resp["statusCode"] == 200
    assert "Oops! You have been phished" in resp["body"] and resp["body"].startswith("<!DOCTYPE html>")
    assert events.puts[0]["eventType"] == "CLICK"


def test_the_campaigns_own_edited_page_wins(mod, monkeypatch):
    own = "<p>Custom page for this campaign</p>"
    resp, _ = _click(mod, monkeypatch, {"landingPageId": "LP-001", "landingPageContent": own}, {"LP-001": {"LandingPageContent": LP}})
    assert own in resp["body"] and "Oops" not in resp["body"]


@pytest.mark.parametrize(
    "campaign, pages",
    [
        ({"landingPageId": "LP-404"}, {}),  # page deleted
        ({"landingPageId": ""}, {}),  # none chosen
        ({"landingPageId": "LP-001"}, {"LP-001": {"LandingPageContent": "   "}}),
        (None, {}),  # campaign gone
    ],
)
def test_no_page_means_the_standard_awareness_page(mod, monkeypatch, campaign, pages):
    resp, events = _click(mod, monkeypatch, campaign, pages)
    assert resp["statusCode"] == 200 and "Security Awareness Training" in resp["body"]
    assert events.puts  # still recorded


def test_unreadable_tables_still_record_and_show_the_standard_page(mod, monkeypatch):
    resp, events = _click(mod, monkeypatch, {"landingPageId": "LP-001"}, fail=True)
    assert resp["statusCode"] == 200 and "Security Awareness Training" in resp["body"]
    assert events.puts


def test_the_page_can_run_no_script_and_submit_no_form(mod, monkeypatch):
    resp, _ = _click(mod, monkeypatch, {"landingPageId": "LP-001"}, {"LP-001": {"LandingPageContent": LP}})
    csp = resp["headers"]["Content-Security-Policy"]
    assert "default-src 'none'" in csp and "script-src" not in csp
    assert "form-action 'none'" in csp


def test_a_bad_token_is_404_and_reads_no_page(mod, monkeypatch):
    monkeypatch.setattr(mod, "recipients_table", _Table({}))
    monkeypatch.setattr(mod, "campaigns_table", _Table({}, "campaignId", fail=True))
    resp = mod.lambda_handler({"pathParameters": {"trackingToken": "nope"}}, SimpleNamespace(aws_request_id="t"))
    assert resp["statusCode"] == 404
    json.dumps(resp)  # serialisable
