"""Tests for reference-api's /scenario-drafts routes.

DynamoDB is moto's in-memory fake (mock_aws), so condition expressions, key
schemas and binary attributes behave as on AWS while nothing leaves the
process -- CI has no AWS credentials or region.
"""
import base64
import importlib.util
import json
import os
import re
from pathlib import Path
from types import SimpleNamespace

import boto3
import pytest
from botocore.exceptions import ClientError
from moto import mock_aws

REPO = Path(__file__).resolve().parents[2]
MODULE_PATH = REPO / "backend" / "reference-api" / "lambda_function.py"

ALICE = "alice@example.test"
BOB = "bob@example.test"
EMAIL_BODY = "<p>Please review the attached invoice before Friday.</p>" * 200


@pytest.fixture(scope="module")
def mod():
    # Set before exec: the module reads TABLE_PREFIX and builds boto3 clients at
    # import time, so both must exist or the import itself raises.
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api_drafts", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def api(mod, monkeypatch):
    for name in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.setenv(name, "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    with mock_aws():
        boto3.resource("dynamodb", region_name="ap-south-1").create_table(
            TableName=f"{mod.TABLE_PREFIX}-scenario-drafts",
            KeySchema=[
                {"AttributeName": "owner", "KeyType": "HASH"},
                {"AttributeName": "draftId", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "owner", "AttributeType": "S"},
                {"AttributeName": "draftId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5},
        )
        # Built lazily inside the mock, never against AWS.
        monkeypatch.setattr(mod, "_drafts_dynamodb", None)
        yield mod


def call(mod, route, *, draft_id=None, owner=None, body=None):
    event = {"routeKey": route}
    if draft_id is not None:
        event["pathParameters"] = {"id": draft_id}
    if owner is not None:
        event["queryStringParameters"] = {"owner": owner}
    if body is not None:
        event["body"] = body if isinstance(body, str) else json.dumps(body)
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


def save_body(
    owner=ALICE,
    base_rev=0,
    save_id="save-1",
    name="Invoice reminder",
    form=None,
    edit=None,
    summary=None,
    saved_at="2026-10-13T10:00:00.000Z",
    tab=1,
):
    draft = {
        "version": 1,
        "savedAt": saved_at,
        "activeTab": tab,
        "formData": form if form is not None else {"scenarioName": name, "emailBody": EMAIL_BODY},
    }
    if edit is not None:
        draft["edit"] = edit
    return {
        "owner": owner,
        "baseRev": base_rev,
        "saveId": save_id,
        "draft": draft,
        "summary": summary if summary is not None else {"name": name, "step": tab + 1},
    }


def put(mod, draft_id, body):
    return call(mod, "PUT /scenario-drafts/{id}", draft_id=draft_id, body=body)


def get(mod, draft_id, owner=ALICE):
    return call(mod, "GET /scenario-drafts/{id}", draft_id=draft_id, owner=owner)


def listing(mod, owner=ALICE):
    return call(mod, "GET /scenario-drafts", owner=owner)


def delete(mod, draft_id, owner=ALICE):
    return call(mod, "DELETE /scenario-drafts/{id}", draft_id=draft_id, owner=owner)


# --- saving and reading back ----------------------------------------------


def test_first_save_is_rev_1_and_reads_back_whole(api):
    status, body = put(api, "SD-abc123", save_body(edit={"scenarioId": "SC-004", "mode": "update"}))
    assert status == 200
    assert body["data"] == {
        "draftId": "SD-abc123",
        "rev": 1,
        "savedAt": "2026-10-13T10:00:00.000Z",
        "updatedAt": body["data"]["updatedAt"],
        "saveId": "save-1",
    }

    status, body = get(api, "SD-abc123")
    assert status == 200
    draft = body["data"]
    assert draft["formData"] == {"scenarioName": "Invoice reminder", "emailBody": EMAIL_BODY}
    assert draft["edit"] == {"scenarioId": "SC-004", "mode": "update"}
    assert draft["summary"] == {"name": "Invoice reminder", "step": 2}
    assert (draft["rev"], draft["activeTab"], draft["version"]) == (1, 1, 1)
    # The owner and the stored blob are never echoed back.
    assert "owner" not in draft and "body" not in draft


def test_a_new_scenario_reads_back_with_no_edit(api):
    put(api, "SD-new1", save_body())
    assert get(api, "SD-new1")[1]["data"]["edit"] is None


def test_owner_is_matched_case_insensitively(api):
    put(api, "SD-case1", save_body(owner="  Alice@Example.TEST "))
    assert get(api, "SD-case1", owner="alice@example.test")[0] == 200


def test_the_form_is_stored_compressed(api):
    put(api, "SD-zip1", save_body())
    row = (
        boto3.resource("dynamodb", region_name="ap-south-1")
        .Table(f"{api.TABLE_PREFIX}-scenario-drafts")
        .get_item(Key={"owner": ALICE, "draftId": "SD-zip1"})["Item"]
    )
    assert len(row["body"].value) * 5 < len(EMAIL_BODY)
    assert isinstance(row["summary"], str)


def test_a_missing_saved_at_takes_the_server_time(api):
    body = save_body()
    del body["draft"]["savedAt"]
    status, saved = put(api, "SD-time1", body)
    assert status == 200 and saved["data"]["savedAt"] == saved["data"]["updatedAt"]


def test_the_step_is_kept_within_the_editor(api):
    put(api, "SD-step1", save_body(tab=9))
    assert get(api, "SD-step1")[1]["data"]["activeTab"] == 3


# --- conflicts ----------------------------------------------------------------


def test_each_save_names_the_rev_it_started_from(api):
    put(api, "SD-rev1", save_body(name="First"))
    status, body = put(api, "SD-rev1", save_body(base_rev=1, save_id="save-2", name="Second"))
    assert status == 200 and body["data"]["rev"] == 2

    # A window still on rev 1 is refused, and told what the server holds.
    status, body = put(api, "SD-rev1", save_body(base_rev=1, save_id="save-3", name="Stale"))
    assert status == 409
    assert body["error"]["code"] == "DRAFT_CONFLICT"
    current = body["error"]["current"]
    assert (current["rev"], current["saveId"]) == (2, "save-2")
    assert get(api, "SD-rev1")[1]["data"]["formData"]["scenarioName"] == "Second"


def test_a_new_draft_never_replaces_an_existing_one(api):
    put(api, "SD-dup1", save_body(name="Kept"))
    status, body = put(api, "SD-dup1", save_body(save_id="save-other", name="Replacement"))
    assert status == 409 and body["error"]["current"]["rev"] == 1
    assert get(api, "SD-dup1")[1]["data"]["formData"]["scenarioName"] == "Kept"


def test_a_save_whose_reply_was_lost_is_recognisable(api):
    put(api, "SD-lost1", save_body(save_id="save-lost"))
    # The client never saw the 200 and sends the same save again.
    status, body = put(api, "SD-lost1", save_body(save_id="save-lost"))
    assert status == 409 and body["error"]["current"]["saveId"] == "save-lost"


def test_saving_onto_a_deleted_draft_reports_nothing_current(api):
    status, body = put(api, "SD-gone1", save_body(base_rev=3))
    assert status == 409 and body["error"]["current"] is None


# --- the list -------------------------------------------------------------------


def test_the_list_is_one_persons_newest_first_and_never_the_form(api):
    put(api, "SD-older", save_body(name="Older", saved_at="2026-10-13T09:00:00.000Z"))
    put(api, "SD-newer", save_body(name="Newer", saved_at="2026-10-13T11:00:00.000Z"))
    put(api, "SD-bobs", save_body(owner=BOB, name="Bob's"))

    status, body = listing(api)
    assert status == 200 and body["count"] == 2
    assert [d["draftId"] for d in body["data"]] == ["SD-newer", "SD-older"]
    first = body["data"][0]
    assert set(first) == {"draftId", "rev", "savedAt", "updatedAt", "version", "activeTab", "summary"}
    assert first["summary"]["name"] == "Newer"


def test_an_empty_list_is_fine(api):
    assert listing(api) == (200, {"data": [], "count": 0})


def test_an_oversized_summary_loses_only_its_picture(api):
    summary = {"name": "Big cover", "cover": "data:image/jpeg;base64," + "A" * (60 * 1024)}
    assert put(api, "SD-cover1", save_body(summary=summary))[0] == 200
    assert listing(api)[1]["data"][0]["summary"] == {"name": "Big cover"}

    too_big = {"name": "x", "description": "y" * (60 * 1024)}
    status, body = put(api, "SD-cover2", save_body(summary=too_big))
    assert status == 400 and "summary" in body["error"]["message"]


# --- other people, deleting ---------------------------------------------------------


def test_someone_else_cannot_read_or_delete_a_draft(api):
    put(api, "SD-mine1", save_body())
    assert get(api, "SD-mine1", owner=BOB)[0] == 404
    assert delete(api, "SD-mine1", owner=BOB)[0] == 204
    assert get(api, "SD-mine1")[0] == 200


def test_delete_can_be_repeated(api):
    put(api, "SD-del1", save_body())
    assert delete(api, "SD-del1")[0] == 204
    assert get(api, "SD-del1")[0] == 404
    assert delete(api, "SD-del1")[0] == 204


# --- size limits -----------------------------------------------------------------


def test_a_draft_too_large_to_store_is_refused_unwritten(api):
    # Random bytes barely compress, like an image pasted into the email body.
    pasted = base64.b64encode(os.urandom(600 * 1024)).decode()
    status, body = put(api, "SD-big1", save_body(form={"emailBody": pasted}))
    assert status == 413 and "too large" in body["error"]["message"]
    assert get(api, "SD-big1")[0] == 404


def test_the_uncompressed_form_has_a_cap_too(api, monkeypatch):
    monkeypatch.setattr(api, "MAX_DRAFT_FORM_BYTES", 1024)
    assert put(api, "SD-big2", save_body())[0] == 413


# --- bad requests -----------------------------------------------------------------


def _without_owner():
    body = save_body()
    del body["owner"]
    return body


def _draft_with(**changes):
    body = save_body()
    body["draft"].update(changes)
    return body


@pytest.mark.parametrize(
    "body",
    [
        _without_owner(),
        save_body(owner="   "),
        save_body(base_rev=True),
        save_body(base_rev=-1),
        save_body(base_rev=1.5),
        save_body(base_rev="1"),
        save_body(save_id="x" * 65),
        {**save_body(), "draft": None},
        _draft_with(version=2),
        _draft_with(version=True),
        _draft_with(formData=["not", "an", "object"]),
        _draft_with(edit="SC-001"),
        {**save_body(), "summary": ["not an object"]},
        ["not", "an", "object"],
    ],
)
def test_bad_saves_are_400_and_unwritten(api, body):
    status, _ = put(api, "SD-bad1", body)
    assert status == 400
    assert get(api, "SD-bad1")[0] == 404


def test_a_body_that_is_not_json_is_400(api):
    assert put(api, "SD-bad2", "{not json")[0] == 400


@pytest.mark.parametrize("draft_id", ["", "SC-001", "SD-", "SD-../x", "SD-a b", "SD-a\n", "SD-" + "a" * 65])
def test_only_draft_ids_are_accepted(api, draft_id):
    assert put(api, draft_id, save_body())[0] == 400
    assert get(api, draft_id)[0] == 400
    assert delete(api, draft_id)[0] == 400


@pytest.mark.parametrize(
    "route", ["GET /scenario-drafts", "GET /scenario-drafts/{id}", "DELETE /scenario-drafts/{id}"]
)
def test_reading_or_deleting_needs_an_owner(api, route):
    assert call(api, route, draft_id="SD-abc")[0] == 400


# --- DynamoDB trouble ------------------------------------------------------------------


class _FailingTable:
    def __init__(self, code):
        self.code = code

    def _fail(self, **_):
        raise ClientError({"Error": {"Code": self.code, "Message": "x"}}, "Op")

    query = get_item = put_item = delete_item = _fail


def test_throttling_is_a_503_to_try_again_later(mod, monkeypatch):
    monkeypatch.setattr(mod, "drafts_table", lambda: _FailingTable("ProvisionedThroughputExceededException"))
    for status, body in (
        listing(mod),
        put(mod, "SD-busy1", save_body()),
        get(mod, "SD-busy1"),
        delete(mod, "SD-busy1"),
    ):
        assert status == 503 and body["error"]["code"] == "BUSY"


def test_other_aws_errors_are_still_a_500(mod, monkeypatch):
    monkeypatch.setattr(mod, "drafts_table", lambda: _FailingTable("ResourceNotFoundException"))
    assert listing(mod)[0] == 500


# --- pure helpers ---------------------------------------------------------------


@pytest.mark.parametrize(
    "value, expected",
    [(0, 0), (2, 2), (3, 3), (7, 3), (-1, 0), ("2", 2), (2.9, 2), (None, 0), (True, 0), ("x", 0), (float("inf"), 0)],
)
def test_draft_step(mod, value, expected):
    assert mod.draft_step(value) == expected


def test_pack_and_unpack_round_trip(mod):
    form = {"scenarioName": "Ünïcode ✓", "emailBody": EMAIL_BODY, "difficulty": 2.5}
    packed = mod.pack_draft_form(mod.draft_form_bytes(form, None))
    assert mod.unpack_draft_form(packed) == {"formData": form, "edit": None}
    assert mod.unpack_draft_form(None) == {"formData": {}, "edit": None}


def test_every_draft_route_is_wired_in_terraform():
    tf = (REPO / "infra" / "terraform" / "reference_api.tf").read_text()
    routes = set(re.findall(r'"((?:GET|PUT|POST|DELETE) /[^"]+)"', tf))
    assert {
        "GET /scenario-drafts",
        "GET /scenario-drafts/{id}",
        "PUT /scenario-drafts/{id}",
        "DELETE /scenario-drafts/{id}",
    } <= routes
