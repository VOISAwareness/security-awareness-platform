"""Unit tests for the email-sender Lambda's pure helpers (no AWS calls).

Only the inline-body / subject renderers are exercised here. The handler itself
talks to DynamoDB, S3 and SES, so it is covered by live verification, not unit
tests (CI has no AWS credentials).
"""
import importlib.util
import os
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "email-sender" / "lambda_function.py"

TRACKING_URL = (
    "https://1ldu4adn0l.execute-api.ap-south-1.amazonaws.com/track/tok-123"
)


@pytest.fixture(scope="module")
def mod():
    # The module reads all of these at import time and builds boto3 clients;
    # dummy values are enough because the helpers under test never call AWS.
    os.environ.setdefault("CAMPAIGNS_TABLE", "t-campaigns")
    os.environ.setdefault("RECIPIENTS_TABLE", "t-recipients")
    os.environ.setdefault("SES_REGION", "ap-south-1")
    os.environ.setdefault("SES_SENDER_EMAIL", "sender@example.com")
    os.environ.setdefault("SES_RECIPIENT_EMAIL", "recipient@example.com")
    os.environ.setdefault("API_BASE_URL", "https://example.execute-api.ap-south-1.amazonaws.com")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("email_sender", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# --- render_inline_body ----------------------------------------------------

def test_inline_body_replaces_phish_link_with_tracking_url(mod):
    body = '<a href="{{phishLink}}">Verify</a>'
    out = mod.render_inline_body(body, "POC User", TRACKING_URL)
    assert "{{phishLink}}" not in out
    assert TRACKING_URL in out


def test_inline_body_replaces_name_placeholder(mod):
    body = "<p>Dear {{userName}},</p><a href=\"{{phishLink}}\">Go</a>"
    out = mod.render_inline_body(body, "POC User", TRACKING_URL)
    assert "{{userName}}" not in out
    assert "POC User" in out


def test_inline_body_replaces_every_link_occurrence(mod):
    # Wizard bodies repeat the link in a "copy and paste" fallback line.
    body = (
        '<a href="{{phishLink}}">Verify</a>'
        "<span>{{phishLink}}</span>"
    )
    out = mod.render_inline_body(body, "POC User", TRACKING_URL)
    assert "{{phishLink}}" not in out
    assert out.count(mod.escape(TRACKING_URL, quote=True)) == 2


def test_inline_body_without_link_placeholder_raises(mod):
    with pytest.raises(ValueError):
        mod.render_inline_body("<p>No link here</p>", "POC User", TRACKING_URL)


def test_inline_body_empty_raises(mod):
    with pytest.raises(ValueError):
        mod.render_inline_body("   ", "POC User", TRACKING_URL)


def test_inline_body_escapes_name_for_html(mod):
    body = '<p>{{userName}}</p><a href="{{phishLink}}">Go</a>'
    out = mod.render_inline_body(body, '<b>"x"</b>', TRACKING_URL)
    assert "<b>" not in out
    assert "&lt;b&gt;" in out


def test_inline_body_accepts_uppercase_tracking_placeholder(mod):
    body = '<a href="{{TRACKING_URL}}">Go</a>'
    out = mod.render_inline_body(body, "POC User", TRACKING_URL)
    assert TRACKING_URL in out


# --- render_subject --------------------------------------------------------

def test_subject_substitutes_at_username(mod):
    out = mod.render_subject("@UserName, your password expired", "POC User")
    assert out == "POC User, your password expired"


def test_subject_blank_falls_back(mod):
    assert mod.render_subject("", "POC User") == "Security Awareness Notification"
    assert mod.render_subject("   ", "POC User") == "Security Awareness Notification"


def test_subject_without_placeholder_unchanged(mod):
    assert mod.render_subject("Security notice", "POC User") == "Security notice"


# --- inline_link_present ---------------------------------------------------

def test_inline_link_present_true(mod):
    assert mod.inline_link_present('<a href="{{phishLink}}">x</a>') is True


def test_inline_link_present_false(mod):
    assert mod.inline_link_present("<p>no link</p>") is False
    assert mod.inline_link_present(None) is False


# --- resolve_recipients ----------------------------------------------------

class FakeMembersTable:
    """Minimal boto3 Table.query over an in-memory member list, with paging."""

    def __init__(self, pages):
        # pages: list of (items, last_key) tuples returned in order.
        self._pages = pages
        self._i = 0

    def query(self, **kwargs):
        items, last_key = self._pages[self._i]
        self._i += 1
        out = {"Items": items}
        if last_key is not None:
            out["LastEvaluatedKey"] = last_key
        return out


def test_resolve_recipients_single_user(mod, monkeypatch):
    monkeypatch.setattr(mod, "members_table", None)
    out = mod.resolve_recipients({"selectedSingleUserEmail": "one@example.com"})
    assert out == [{"email": "one@example.com", "name": "POC User"}]


def test_resolve_recipients_falls_back_to_env_recipient(mod, monkeypatch):
    monkeypatch.setattr(mod, "members_table", None)
    out = mod.resolve_recipients({})
    assert out == [{"email": mod.SES_RECIPIENT_EMAIL, "name": "POC User"}]


def test_resolve_recipients_list_requires_members_table(mod, monkeypatch):
    monkeypatch.setattr(mod, "members_table", None)
    with pytest.raises(ValueError):
        mod.resolve_recipients({"selectedListId": "ul-001"})


def test_resolve_recipients_reads_list_members(mod, monkeypatch):
    fake = FakeMembersTable(
        [
            ([{"email": "a@example.com", "userName": "Alice"}], {"k": 1}),
            ([{"email": "b@example.com"}], None),
        ]
    )
    monkeypatch.setattr(mod, "members_table", fake)
    out = mod.resolve_recipients({"selectedListId": "ul-001"})
    assert out == [
        {"email": "a@example.com", "name": "Alice"},
        {"email": "b@example.com", "name": "POC User"},
    ]


def test_resolve_recipients_skips_memberless_rows(mod, monkeypatch):
    fake = FakeMembersTable([([{"userName": "no email"}, {"email": "c@example.com"}], None)])
    monkeypatch.setattr(mod, "members_table", fake)
    out = mod.resolve_recipients({"selectedListId": "ul-001"})
    assert out == [{"email": "c@example.com", "name": "POC User"}]


def test_resolve_recipients_prefers_list_over_single(mod, monkeypatch):
    fake = FakeMembersTable([([{"email": "list@example.com"}], None)])
    monkeypatch.setattr(mod, "members_table", fake)
    out = mod.resolve_recipients(
        {"selectedListId": "ul-001", "selectedSingleUserEmail": "single@example.com"}
    )
    assert out == [{"email": "list@example.com", "name": "POC User"}]
