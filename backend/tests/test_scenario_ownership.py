"""Unit tests for scenario ownership in reference-api (no AWS calls).

The rules live in pure helpers, which most tests exercise directly. The
handler tests swap `table()` for in-memory fakes, so nothing here reaches
DynamoDB or S3 -- CI has no AWS credentials or region.
"""
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace

import pytest
from botocore.exceptions import ClientError

MODULE_PATH = Path(__file__).resolve().parents[1] / "reference-api" / "lambda_function.py"

ALICE, BOB, CAROL = "alice@x.com", "bob@x.com", "carol@x.com"


@pytest.fixture(scope="module")
def mod():
    # Set before exec: the module reads TABLE_PREFIX and builds boto3 clients at
    # import time, so both must exist or the import itself raises.
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("reference_api_ownership", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sc(sid, by=None, **fields):
    row = {"scenarioId": sid, "scenarioName": f"name {sid}", "emailBody": f"<p>{sid}</p>"}
    if by:
        row["createdBy"] = by
    row.update(fields)
    return row


# A small world for the visibility matrix.
#   T1, T2 templates;  A1 alice private;  A2 alice shared + her pending revision A2R;
#   A3 alice shared, revision A3R already published;  B1 bob shared;  B2 bob private
#   (legacy mixed-case createdBy);  BC1 bob's copy of T1 (sent, still private);
#   BC2 bob's copy of alice's A2;  CC1 carol's copy of bob's B1.
WORLD = [
    sc("T1"),
    sc("T2"),
    sc("A1", ALICE),
    sc("A2", ALICE),
    sc("A2R", ALICE, revisionOf="A2"),
    sc("A3", ALICE),
    sc("A3R", ALICE, revisionOf="A3", publishedAt="2026-10-01T00:00:00+00:00"),
    sc("B1", BOB),
    sc("B2", "Bob@X.com"),
    sc("BC1", BOB, copyOf="T1"),
    sc("BC2", BOB, copyOf="A2"),
    sc("CC1", CAROL, copyOf="B1"),
]
SENT = {"A2", "A3", "A3R", "B1", "BC1"}


def view(mod, viewer, rows=WORLD, sent=SENT):
    return {r["scenarioId"]: r for r in mod.visible_scenarios(rows, sent, viewer)}


# --- parse_identity / sent_scenario_ids -----------------------------------


def test_parse_identity_trims_and_lowercases(mod):
    assert mod.parse_identity("  Alice@X.COM ") == ALICE


@pytest.mark.parametrize("value", [None, "", "   ", 42, ["a@x.com"], {"a": 1}])
def test_parse_identity_is_empty_for_missing_or_odd_values(mod, value):
    assert mod.parse_identity(value) == ""


def test_sent_scenario_ids_reads_current_and_legacy_rows(mod):
    rows = [
        {"status": "SENT", "scenarioId": "SC-1"},
        {"status": "sent", "scenarioId": "SC-2"},
        {"CampaignStatus": "Sent", "ScenarioID": "SC-3"},
        {"status": "SENDING", "scenarioId": "SC-4"},
        {"status": "DRAFT", "scenarioId": "SC-5"},
        {"status": "APPROVED", "ScenarioID": "SC-6"},
        {"status": "SENT"},
        {"status": "SENT", "scenarioId": ""},
        {"scenarioId": "SC-7"},
    ]
    assert mod.sent_scenario_ids(rows) == {"SC-1", "SC-2", "SC-3"}


def test_scenario_kind(mod):
    assert mod.scenario_kind(sc("T")) == "template"
    assert mod.scenario_kind(sc("T", "  ")) == "template"
    assert mod.scenario_kind(sc("A", ALICE)) == "own"
    assert mod.scenario_kind(sc("C", ALICE, copyOf="T")) == "copy"
    assert mod.scenario_kind(sc("R", ALICE, revisionOf="A")) == "revision"


# --- visible_scenarios: the matrix ------------------------------------------


def test_alice_sees_templates_her_own_and_others_shared(mod):
    seen = view(mod, ALICE)
    assert set(seen) == {"T1", "T2", "A1", "A2R", "A3", "B1"}
    assert seen["T1"]["ownership"] == "template"
    assert (seen["A1"]["ownership"], seen["A1"]["isShared"]) == ("mine", False)
    assert (seen["A3"]["ownership"], seen["A3"]["isShared"]) == ("mine", True)
    assert (seen["B1"]["ownership"], seen["B1"]["isShared"]) == ("shared", True)


def test_pending_revision_stands_in_for_the_owners_shared_scenario(mod):
    seen = view(mod, ALICE)
    assert "A2" not in seen
    rev = seen["A2R"]
    assert (rev["ownership"], rev["isShared"], rev["replaces"]) == ("myRevision", False, "A2")


def test_published_revision_is_hidden_from_everyone(mod):
    for viewer in (ALICE, BOB, CAROL):
        assert "A3R" not in view(mod, viewer)


def test_bob_sees_his_copies_instead_of_what_they_copy(mod):
    seen = view(mod, BOB)
    assert set(seen) == {"BC1", "T2", "BC2", "A3", "B1", "B2"}
    assert (seen["BC1"]["ownership"], seen["BC1"]["replaces"]) == ("myCopy", "T1")
    assert (seen["BC2"]["ownership"], seen["BC2"]["replaces"]) == ("myCopy", "A2")


def test_a_sent_copy_stays_private_and_unshared(mod):
    assert view(mod, BOB)["BC1"]["isShared"] is False
    assert "BC1" not in view(mod, ALICE)
    assert "BC1" not in view(mod, CAROL)


def test_legacy_mixed_case_creator_still_owns_the_row(mod):
    assert view(mod, BOB)["B2"]["ownership"] == "mine"


def test_carol_sees_shared_rows_and_her_copy_only(mod):
    seen = view(mod, CAROL)
    assert set(seen) == {"T1", "T2", "A2", "A3", "CC1"}
    assert seen["A2"]["ownership"] == "shared"
    assert (seen["CC1"]["ownership"], seen["CC1"]["replaces"]) == ("myCopy", "B1")


def test_private_scenarios_copies_and_revisions_never_leak(mod):
    for viewer, foreign in (
        (ALICE, {"B2", "BC1", "BC2", "CC1"}),
        (BOB, {"A1", "A2R", "CC1"}),
        (CAROL, {"A1", "A2R", "B2", "BC1", "BC2"}),
    ):
        assert not foreign & set(view(mod, viewer))


def test_a_stranger_sees_templates_and_shared_only(mod):
    seen = view(mod, "dave@x.com")
    assert set(seen) == {"T1", "T2", "A2", "A3", "B1"}


def test_viewer_is_compared_case_insensitively(mod):
    assert set(view(mod, "  ALICE@x.com ")) == set(view(mod, ALICE))


def test_every_row_is_annotated_and_inputs_are_untouched(mod):
    rows = [dict(r) for r in WORLD]
    for row in mod.visible_scenarios(rows, SENT, ALICE):
        assert {"ownership", "isShared", "replaces"} <= set(row)
        if row["ownership"] not in ("myCopy", "myRevision"):
            assert row["replaces"] is None
    assert rows == WORLD, "annotations are response-only"


def test_copy_of_own_scenario_does_not_hide_it(mod):
    """Bad data (the API refuses such a POST) must not make a row vanish."""
    rows = [sc("A1", ALICE), sc("X", ALICE, copyOf="A1")]
    assert set(view(mod, ALICE, rows, {"A1"})) == {"A1", "X"}


def test_unshared_scenario_becomes_visible_once_sent(mod):
    rows = [sc("A1", ALICE)]
    assert view(mod, BOB, rows, set()) == {}
    assert view(mod, BOB, rows, {"A1"})["A1"]["ownership"] == "shared"


# --- publishable_revisions --------------------------------------------------


def test_sent_revision_by_the_owner_is_publishable(mod):
    original = sc("A2", ALICE, CreatedOn="1-Jan-26", CoverImageID="uploads/scenario-covers/A2/a.png")
    rev = sc(
        "A2R",
        ALICE,
        revisionOf="A2",
        CreatedOn="9-Oct-26",
        scenarioName="Better name",
        CoverImageID="uploads/scenario-covers/A2R/b.png",
        ownership="myRevision",
        coverImageKey="uploads/x",
    )
    [(r, o, merged)] = mod.publishable_revisions([original, rev], {"A2R"})
    assert r is rev and o is original
    assert merged["scenarioId"] == "A2"
    assert merged["createdBy"] == ALICE
    assert merged["CreatedOn"] == "1-Jan-26"
    assert merged["scenarioName"] == "Better name"
    assert merged["emailBody"] == "<p>A2R</p>"
    assert merged["CoverImageID"] == "uploads/scenario-covers/A2R/b.png"
    for field in ("revisionOf", "publishedAt", "copyOf", "ownership", "coverImageKey"):
        assert field not in merged


def test_unsent_revision_is_not_published(mod):
    assert mod.publishable_revisions([sc("A2", ALICE), sc("R", ALICE, revisionOf="A2")], {"A2"}) == []


def test_already_published_revision_is_not_picked_again(mod):
    rows = [sc("A2", ALICE), sc("R", ALICE, revisionOf="A2", publishedAt="2026-10-01")]
    assert mod.publishable_revisions(rows, {"R"}) == []


def test_revision_by_someone_else_is_never_published(mod):
    rows = [sc("A2", ALICE), sc("R", BOB, revisionOf="A2")]
    assert mod.publishable_revisions(rows, {"R"}) == []


def test_revision_owner_is_compared_case_insensitively(mod):
    rows = [sc("A2", "Alice@X.com"), sc("R", ALICE, revisionOf="A2")]
    assert len(mod.publishable_revisions(rows, {"R"})) == 1


def test_revision_of_a_missing_or_non_own_row_is_not_published(mod):
    assert mod.publishable_revisions([sc("R", ALICE, revisionOf="GONE")], {"R"}) == []
    rows = [sc("T1"), sc("R", ALICE, revisionOf="T1")]
    assert mod.publishable_revisions(rows, {"R"}) == []


def test_copies_are_never_published(mod):
    rows = [sc("T1"), sc("C", ALICE, copyOf="T1")]
    assert mod.publishable_revisions(rows, {"C"}) == []


# --- cover keys ---------------------------------------------------------------

SIGNED = (
    "https://bucket.s3.ap-south-1.amazonaws.com/uploads/scenario-covers/SC-001/a.png"
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=abc&X-Amz-Signature=def"
)


def test_cover_key_from_virtual_hosted_presigned_url(mod):
    assert mod.cover_key_from_url(SIGNED) == "uploads/scenario-covers/SC-001/a.png"


def test_cover_key_from_path_style_presigned_url(mod):
    url = "https://s3.amazonaws.com/bucket/uploads/scenario-covers/SC-1/a.png?X-Amz-Signature=1"
    assert mod.cover_key_from_url(url) == "uploads/scenario-covers/SC-1/a.png"


def test_cover_key_from_url_is_url_decoded(mod):
    url = "https://b.s3.amazonaws.com/uploads/scenario-covers/SC%201/my%20cover.png?X-Amz-Date=1"
    assert mod.cover_key_from_url(url) == "uploads/scenario-covers/SC 1/my cover.png"


@pytest.mark.parametrize(
    "value",
    [
        "uploads/scenario-covers/SC-001/a.png",
        "CovImg-003.png",
        "",
        None,
        42,
        "https://example.com/uploads/a.png",
        "https://b.s3.amazonaws.com/images/a.png?X-Amz-Signature=1",
        "ftp://b/uploads/a.png?X-Amz-Signature=1",
    ],
)
def test_cover_key_from_url_leaves_everything_else_alone(mod, value):
    assert mod.cover_key_from_url(value) == value


class _FakeS3:
    def generate_presigned_url(self, op, Params, ExpiresIn):
        return f"https://{Params['Bucket']}.s3.amazonaws.com/{Params['Key']}?X-Amz-Signature=sig"


def test_sign_cover_returns_the_stored_key_alongside(mod, monkeypatch):
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", "bucket")
    monkeypatch.setattr(mod, "s3_client", _FakeS3())
    key = "uploads/scenario-covers/SC-001/a.png"
    signed = mod.sign_cover({"scenarioId": "SC-001", "CoverImageID": key})
    assert signed["CoverImageID"].startswith("https://")
    assert signed["coverImageKey"] == key
    assert mod.cover_key_from_url(signed["CoverImageID"]) == key, "round-trips"


def test_sign_cover_adds_no_key_when_nothing_was_signed(mod, monkeypatch):
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", "bucket")
    assert "coverImageKey" not in mod.sign_cover({"CoverImageID": "CovImg-001.png"})
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", None)
    assert "coverImageKey" not in mod.sign_cover({"CoverImageID": "uploads/a.png"})


# --- body cleaning ------------------------------------------------------------


def test_clean_scenario_input_drops_response_only_fields(mod):
    item = mod.clean_scenario_input(
        {
            "scenarioName": "x",
            "createdBy": "  Bob@X.com ",
            "copyOf": " T1 ",
            "revisionOf": "",
            "publishedAt": "2026-01-01",
            "ownership": "template",
            "isShared": False,
            "replaces": None,
            "coverImageKey": "uploads/k.png",
            "actor": BOB,
            "CoverImageID": SIGNED,
        }
    )
    assert item == {
        "scenarioName": "x",
        "createdBy": BOB,
        "copyOf": "T1",
        "CoverImageID": "uploads/scenario-covers/SC-001/a.png",
    }


def test_clean_scenario_input_omits_blank_creator(mod):
    assert "createdBy" not in mod.clean_scenario_input({"scenarioName": "x", "createdBy": " "})


def test_scenario_update_ignores_locked_and_response_only_fields(mod):
    existing = sc("C", BOB, copyOf="T1", CreatedOn="1-Jan-26")
    merged = mod.scenario_update(
        existing,
        {
            "scenarioName": "renamed",
            "scenarioId": "HIJACK",
            "createdBy": ALICE,
            "copyOf": "T2",
            "revisionOf": "A2",
            "publishedAt": "now",
            "actor": BOB,
            "ownership": "myCopy",
            "isShared": True,
            "replaces": "T1",
            "coverImageKey": "uploads/k.png",
            "CoverImageID": SIGNED,
        },
    )
    assert merged == {
        **existing,
        "scenarioName": "renamed",
        "CoverImageID": "uploads/scenario-covers/SC-001/a.png",
    }


# --- create_refusal (POST) ----------------------------------------------------


def refusal(resp):
    return None if resp is None else (resp["statusCode"], json.loads(resp["body"])["error"])


def create(mod, rows=WORLD, sent=SENT, **body):
    return refusal(mod.create_refusal(mod.clean_scenario_input(body), rows, sent))


def test_plain_create_has_no_rules(mod):
    assert create(mod, createdBy=ALICE) is None
    assert create(mod) is None


def test_copy_of_a_template_or_someone_elses_shared_scenario(mod):
    assert create(mod, createdBy=ALICE, copyOf="T2") is None
    assert create(mod, createdBy=CAROL, copyOf="A2") is None
    assert create(mod, createdBy=ALICE, copyOf="B1") is None


@pytest.mark.parametrize(
    "target",
    [
        "NOPE",  # missing
        "A1",  # own scenario
        "A3",  # own shared scenario: edit it with a revision instead
        "B2",  # someone else's private scenario
        "BC1",  # a copy
        "A2R",  # a revision
        "A3R",  # a published revision
    ],
)
def test_copy_of_anything_else_is_400(mod, target):
    assert create(mod, createdBy=ALICE, copyOf=target)[0] == 400


def test_copy_or_revision_needs_a_creator(mod):
    assert create(mod, copyOf="T1")[0] == 400
    assert create(mod, revisionOf="A2")[0] == 400


def test_copy_and_revision_at_once_is_400(mod):
    assert create(mod, createdBy=ALICE, copyOf="T1", revisionOf="A3")[0] == 400


def test_second_copy_of_the_same_row_is_409_with_existing_id(mod):
    status, error = create(mod, createdBy="BOB@x.com", copyOf="T1")
    assert status == 409
    assert error["existingId"] == "BC1"
    assert error["message"]


def test_someone_elses_copy_does_not_block_mine(mod):
    assert create(mod, createdBy=CAROL, copyOf="T1") is None


def test_revision_of_own_shared_scenario(mod):
    assert create(mod, createdBy=ALICE, revisionOf="A3") is None
    assert create(mod, createdBy=BOB, revisionOf="B1") is None


@pytest.mark.parametrize(
    "author, target",
    [
        (ALICE, "A1"),  # own but not shared: edit it directly
        (ALICE, "B1"),  # someone else's shared scenario: copy it instead
        (ALICE, "T1"),  # a template
        (BOB, "BC1"),  # a copy (sent, but copies are never shared)
        (ALICE, "NOPE"),
    ],
)
def test_revision_of_anything_else_is_400(mod, author, target):
    assert create(mod, createdBy=author, revisionOf=target)[0] == 400


def test_second_pending_revision_is_409_with_existing_id(mod):
    status, error = create(mod, createdBy=ALICE, revisionOf="A2")
    assert (status, error["existingId"]) == (409, "A2R")


def test_a_published_revision_does_not_block_the_next_one(mod):
    """A3R is published, so a fresh revision of A3 is fine."""
    assert create(mod, createdBy=ALICE, revisionOf="A3") is None


# --- modify_refusal (PUT / DELETE) --------------------------------------------


def modify(mod, sid, actor, action, rows=WORLD, sent=SENT):
    row = next(r for r in rows if r["scenarioId"] == sid)
    return refusal(mod.modify_refusal(row, actor, sent, action))


@pytest.mark.parametrize("action", ["edit", "delete"])
def test_actor_is_required(mod, action):
    assert modify(mod, "A1", None, action)[0] == 400
    assert modify(mod, "A1", "  ", action)[0] == 400


@pytest.mark.parametrize("action", ["edit", "delete"])
def test_templates_are_403(mod, action):
    assert modify(mod, "T1", ALICE, action)[0] == 403


@pytest.mark.parametrize("action", ["edit", "delete"])
@pytest.mark.parametrize("sid", ["A1", "A2R", "B1", "BC1"])
def test_only_the_creator_may_change_a_row(mod, action, sid):
    assert modify(mod, sid, CAROL, action)[0] == 403


@pytest.mark.parametrize("action", ["edit", "delete"])
@pytest.mark.parametrize("sid, actor", [("A1", ALICE), ("A2R", "ALICE@x.com"), ("BC1", BOB), ("BC2", BOB), ("B2", BOB)])
def test_creator_may_change_private_rows_copies_and_pending_revisions(mod, action, sid, actor):
    assert modify(mod, sid, actor, action) is None


def test_shared_own_scenario_cannot_be_edited_directly(mod):
    status, error = modify(mod, "A2", ALICE, "edit")
    assert status == 409 and "revision" in error["message"]


def test_shared_own_scenario_cannot_be_deleted(mod):
    status, error = modify(mod, "B1", BOB, "delete")
    assert status == 409 and "Shared" in error["message"]


@pytest.mark.parametrize("action", ["edit", "delete"])
def test_published_revision_is_409(mod, action):
    status, error = modify(mod, "A3R", ALICE, action)
    assert status == 409 and "campaign history" in error["message"]


@pytest.mark.parametrize("action", ["edit", "delete"])
def test_revision_sent_but_not_yet_published_is_409(mod, action):
    assert modify(mod, "A2R", ALICE, action, sent=SENT | {"A2R"})[0] == 409


# --- handler wiring, with in-memory tables ------------------------------------

CONDITIONS = {
    "attribute_not_exists(scenarioId)": lambda cur, vals: cur is None,
    "attribute_exists(scenarioId) AND attribute_not_exists(publishedAt)": (
        lambda cur, vals: cur is not None and "publishedAt" not in cur
    ),
    "attribute_exists(scenarioId) AND createdBy = :by": (
        lambda cur, vals: cur is not None and cur.get("createdBy") == vals[":by"]
    ),
    "attribute_not_exists(publishedAt)": lambda cur, vals: cur is None or "publishedAt" not in cur,
}


def _check(kwargs, current):
    cond = kwargs.get("ConditionExpression")
    if cond and not CONDITIONS[cond](current, kwargs.get("ExpressionAttributeValues", {})):
        raise ClientError({"Error": {"Code": "ConditionalCheckFailedException"}}, "Write")


class FakeTable:
    def __init__(self, rows, key="scenarioId"):
        self.key = key
        self.rows = {r[key]: dict(r) for r in rows}
        self.writes = []
        self.scans = 0

    def scan(self, **kwargs):
        self.scans += 1
        return {"Items": [dict(r) for r in self.rows.values()]}

    def get_item(self, Key):
        row = self.rows.get(Key[self.key])
        return {"Item": dict(row)} if row else {}

    def put_item(self, Item, **kwargs):
        _check(kwargs, self.rows.get(Item[self.key]))
        self.writes.append(("put", Item[self.key]))
        self.rows[Item[self.key]] = dict(Item)

    def update_item(self, Key, ExpressionAttributeValues, **kwargs):
        _check({**kwargs, "ExpressionAttributeValues": ExpressionAttributeValues}, self.rows.get(Key[self.key]))
        assert kwargs["UpdateExpression"] == "SET publishedAt = :at"
        self.writes.append(("update", Key[self.key]))
        self.rows[Key[self.key]]["publishedAt"] = ExpressionAttributeValues[":at"]

    def delete_item(self, Key, **kwargs):
        _check(kwargs, self.rows.get(Key[self.key]))
        self.writes.append(("delete", Key[self.key]))
        self.rows.pop(Key[self.key], None)


@pytest.fixture
def world(mod, monkeypatch):
    tables = {
        "scenarios": FakeTable(WORLD),
        "campaigns": FakeTable(
            [{"campaignId": f"c-{sid}", "status": "SENT", "scenarioId": sid} for sid in sorted(SENT)]
            + [{"campaignId": "c-draft", "status": "DRAFT", "scenarioId": "A1"}],
            key="campaignId",
        ),
    }
    monkeypatch.setattr(mod, "table", lambda name: tables[name])
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", None)
    return tables


def call(mod, route, sid=None, body=None, query=None):
    event = {"routeKey": route, "pathParameters": {"id": sid} if sid else None}
    if body is not None:
        event["body"] = json.dumps(body)
    if query is not None:
        event["queryStringParameters"] = query
    resp = mod.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    return resp["statusCode"], json.loads(resp["body"])


def test_list_without_viewer_is_unchanged(mod, world):
    status, body = call(mod, "GET /scenarios")
    assert status == 200
    assert body["data"] == WORLD and body["count"] == len(WORLD)
    assert world["campaigns"].scans == 0, "no campaign scan, no publish"
    assert world["scenarios"].writes == []


def test_list_with_blank_viewer_is_unchanged(mod, world):
    _, body = call(mod, "GET /scenarios", query={"viewer": "  "})
    assert body["data"] == WORLD


def test_list_with_viewer_filters_and_annotates(mod, world):
    status, body = call(mod, "GET /scenarios", query={"viewer": "Bob@X.com"})
    assert status == 200
    ids = {r["scenarioId"]: r["ownership"] for r in body["data"]}
    assert ids == {
        "BC1": "myCopy",
        "T2": "template",
        "BC2": "myCopy",
        "A3": "shared",
        "B1": "mine",
        "B2": "mine",
    }
    assert body["count"] == 6
    assert world["campaigns"].scans == 1


def test_list_publishes_a_sent_revision_once(mod, world, monkeypatch):
    world["campaigns"].rows["c-A2R"] = {"campaignId": "c-A2R", "status": "SENT", "scenarioId": "A2R"}
    world["scenarios"].rows["A2R"]["scenarioName"] = "Revised"

    _, body = call(mod, "GET /scenarios", query={"viewer": ALICE})
    seen = {r["scenarioId"]: r for r in body["data"]}
    assert "A2R" not in seen, "published revisions are hidden"
    assert seen["A2"]["scenarioName"] == "Revised"
    assert (seen["A2"]["ownership"], seen["A2"]["isShared"]) == ("mine", True)
    assert world["scenarios"].writes == [("put", "A2"), ("update", "A2R")]
    stored = world["scenarios"].rows
    assert stored["A2"]["scenarioName"] == "Revised"
    assert stored["A2"]["scenarioId"] == "A2" and "revisionOf" not in stored["A2"]
    assert stored["A2R"]["publishedAt"]

    # Idempotent: the next list (by anyone) writes nothing more.
    _, again = call(mod, "GET /scenarios", query={"viewer": BOB})
    assert world["scenarios"].writes == [("put", "A2"), ("update", "A2R")]
    assert {r["scenarioId"]: r for r in again["data"]}["BC2"]["replaces"] == "A2"


def test_list_survives_a_failed_publish(mod, world):
    """The original's owner changed under us: skip, and still list."""
    world["campaigns"].rows["c-A2R"] = {"campaignId": "c-A2R", "status": "SENT", "scenarioId": "A2R"}
    real_put = world["scenarios"].put_item

    def racing_put(Item, **kwargs):
        world["scenarios"].rows["A2"]["createdBy"] = "someone@else.com"
        return real_put(Item, **kwargs)

    world["scenarios"].put_item = racing_put
    status, body = call(mod, "GET /scenarios", query={"viewer": ALICE})
    assert status == 200
    assert "A2R" in {r["scenarioId"] for r in body["data"]}
    assert "publishedAt" not in world["scenarios"].rows["A2R"]


def test_list_and_get_return_the_cover_key_when_signed(mod, world, monkeypatch):
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", "bucket")
    monkeypatch.setattr(mod, "s3_client", _FakeS3())
    world["scenarios"].rows["A1"]["CoverImageID"] = "uploads/scenario-covers/A1/c.png"
    _, body = call(mod, "GET /scenarios", query={"viewer": ALICE})
    a1 = {r["scenarioId"]: r for r in body["data"]}["A1"]
    assert a1["coverImageKey"] == "uploads/scenario-covers/A1/c.png"
    assert a1["CoverImageID"].startswith("https://")
    _, one = call(mod, "GET /scenarios/{id}", "A1")
    assert one["data"]["coverImageKey"] == "uploads/scenario-covers/A1/c.png"
    assert "coverImageKey" not in world["scenarios"].rows["A1"]


def test_post_copy_gets_a_server_id_and_is_stored_clean(mod, world):
    status, body = call(
        mod,
        "POST /scenarios",
        body={
            **sc("T1"),
            "scenarioId": "T1",
            "CreatedOn": "1-Jan-20",
            "createdBy": "Carol@X.com",
            "copyOf": "T1",
            "ownership": "template",
            "isShared": False,
            "replaces": None,
            "coverImageKey": "uploads/scenario-covers/T1/a.png",
            "CoverImageID": SIGNED,
        },
    )
    assert status == 201
    item = body["data"]
    assert item["scenarioId"] == "SC-001"
    assert item["createdBy"] == CAROL and item["copyOf"] == "T1"
    assert item["CreatedOn"] != "1-Jan-20"
    assert item["CoverImageID"] == "uploads/scenario-covers/SC-001/a.png"
    stored = world["scenarios"].rows["SC-001"]
    assert stored == item
    for field in ("ownership", "isShared", "replaces", "coverImageKey", "actor", "publishedAt"):
        assert field not in stored
    assert world["scenarios"].rows["T1"] == sc("T1"), "the template is untouched"


def test_post_copy_continues_the_sequence(mod, world):
    world["scenarios"].rows["SC-004"] = sc("SC-004", ALICE)
    _, body = call(mod, "POST /scenarios", body={"scenarioName": "x", "createdBy": CAROL, "copyOf": "T2"})
    assert body["data"]["scenarioId"] == "SC-005"


def test_post_duplicate_copy_is_409_with_existing_id(mod, world):
    status, body = call(mod, "POST /scenarios", body={"scenarioName": "x", "createdBy": BOB, "copyOf": "T1"})
    assert status == 409
    assert body["error"]["existingId"] == "BC1"
    assert len(world["scenarios"].rows) == len(WORLD)


def test_post_invalid_revision_is_400(mod, world):
    status, _ = call(mod, "POST /scenarios", body={"scenarioName": "x", "createdBy": BOB, "revisionOf": "A2"})
    assert status == 400


def test_post_revision_of_own_shared_scenario(mod, world):
    status, body = call(
        mod, "POST /scenarios", body={"scenarioName": "x", "createdBy": BOB, "revisionOf": "B1"}
    )
    assert status == 201
    assert body["data"]["revisionOf"] == "B1" and body["data"]["scenarioId"] == "SC-001"


def test_post_plain_scenario_keeps_typed_id_and_lowercases_creator(mod, world):
    status, body = call(mod, "POST /scenarios", body={"scenarioName": "x", "scenarioId": "MY-1", "createdBy": "Dave@X.com"})
    assert status == 201
    assert world["scenarios"].rows["MY-1"]["createdBy"] == "dave@x.com"


def test_post_plain_scenario_with_taken_id_is_still_409(mod, world):
    status, body = call(mod, "POST /scenarios", body={"scenarioName": "x", "scenarioId": "A1", "createdBy": ALICE})
    assert status == 409 and "existingId" not in body["error"]
    assert world["scenarios"].rows["A1"] == sc("A1", ALICE)


def test_post_copy_still_has_the_size_guard(mod, world):
    big = "x" * (mod.MAX_ITEM_BYTES + 1)
    status, _ = call(mod, "POST /scenarios", body={"scenarioName": "x", "createdBy": CAROL, "copyOf": "T1", "emailBody": big})
    assert status == 413


def test_put_by_owner_saves_and_ignores_locked_fields(mod, world):
    status, body = call(
        mod,
        "PUT /scenarios/{id}",
        "BC1",
        body={"scenarioName": "renamed", "actor": "BOB@x.com", "createdBy": ALICE, "copyOf": "T2", "isShared": True},
    )
    assert status == 200
    stored = world["scenarios"].rows["BC1"]
    assert stored == {**sc("BC1", BOB, copyOf="T1"), "scenarioName": "renamed"}
    assert body["data"] == stored


@pytest.mark.parametrize(
    "sid, body, expected",
    [
        ("A1", {"scenarioName": "x"}, 400),
        ("T1", {"actor": ALICE}, 403),
        ("A1", {"actor": BOB}, 403),
        ("A2", {"actor": ALICE}, 409),
        ("A3R", {"actor": ALICE}, 409),
        ("NOPE", {"actor": ALICE}, 404),
    ],
)
def test_put_refusals_write_nothing(mod, world, sid, body, expected):
    status, _ = call(mod, "PUT /scenarios/{id}", sid, body=body)
    assert status == expected
    assert world["scenarios"].writes == []


def test_put_onto_a_row_published_meanwhile_is_409(mod, world):
    real_get = world["scenarios"].get_item

    def stale_get(Key):
        resp = real_get(Key)
        world["scenarios"].rows["A2R"]["publishedAt"] = "just now"
        return resp

    world["scenarios"].get_item = stale_get
    status, _ = call(mod, "PUT /scenarios/{id}", "A2R", body={"actor": ALICE, "scenarioName": "late"})
    assert status == 409
    assert world["scenarios"].rows["A2R"]["scenarioName"] == "name A2R"


@pytest.mark.parametrize("sid, actor", [("A1", ALICE), ("BC1", BOB), ("A2R", ALICE)])
def test_delete_by_owner(mod, world, monkeypatch, sid, actor):
    cleaned = []
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", "bucket")
    monkeypatch.setattr(mod, "delete_s3_prefix", lambda bucket, prefix: cleaned.append(prefix))
    status, _ = call(mod, "DELETE /scenarios/{id}", sid, query={"actor": actor.upper()})
    assert status == 204
    assert sid not in world["scenarios"].rows
    assert cleaned == [f"uploads/scenario-covers/{sid}/"]


@pytest.mark.parametrize(
    "sid, query, expected",
    [
        ("A1", None, 400),
        ("T1", {"actor": ALICE}, 403),
        ("A1", {"actor": BOB}, 403),
        ("B1", {"actor": BOB}, 409),
        ("A3R", {"actor": ALICE}, 409),
    ],
)
def test_delete_refusals_keep_the_row(mod, world, sid, query, expected):
    status, _ = call(mod, "DELETE /scenarios/{id}", sid, query=query)
    assert status == expected
    assert sid in world["scenarios"].rows
    assert world["scenarios"].writes == []


def test_delete_of_a_missing_row_is_204_and_touches_nothing(mod, world, monkeypatch):
    cleaned = []
    monkeypatch.setattr(mod, "UPLOAD_BUCKET", "bucket")
    monkeypatch.setattr(mod, "delete_s3_prefix", lambda bucket, prefix: cleaned.append(prefix))
    status, _ = call(mod, "DELETE /scenarios/{id}", "NOPE", query={"actor": ALICE})
    assert status == 204
    assert cleaned == [] and world["scenarios"].writes == []
