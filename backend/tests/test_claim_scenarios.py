"""Unit tests for seed-data/claim_scenarios.py helpers (no AWS calls)."""
import importlib.util
import json
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "seed-data" / "claim_scenarios.py"


@pytest.fixture(scope="module")
def mod():
    spec = importlib.util.spec_from_file_location("claim_scenarios", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def rows():
    return [
        {"scenarioId": "SC-001", "scenarioName": "Bundled template"},
        {"scenarioId": "SC-104", "scenarioName": "BW testing"},
        {"scenarioId": "SC-105", "scenarioName": "SPDA"},
        {"scenarioId": "SC-106", "scenarioName": "Someone else's", "createdBy": "b@x.com"},
        {"scenarioId": "SC-107", "scenarioName": "Blank owner", "createdBy": "  "},
    ]


def test_only_unowned_non_template_rows_that_were_asked_for_are_claimed(mod):
    plan, missing = mod.plan_claims(rows(), ["SC-104", "SC-001", "SC-106", "SC-999"], {"SC-001"})
    actions = {row["scenarioId"]: action for row, action in plan}
    assert actions == {
        "SC-001": "template",
        "SC-104": "claim",
        "SC-105": "not selected",
        "SC-107": "not selected",
    }
    assert "SC-106" not in actions, "rows with an owner are never listed"
    assert missing == ["SC-106", "SC-999"]


def test_nothing_is_claimed_without_ids(mod):
    plan, missing = mod.plan_claims(rows(), [], set())
    assert all(action == "not selected" for _, action in plan) and missing == []


def test_ids_are_parsed_from_a_comma_list(mod):
    assert mod.parse_ids(" SC-104, ,SC-105 ,") == ["SC-104", "SC-105"]
    assert mod.parse_ids("") == [] and mod.parse_ids(None) == []


def test_template_ids_come_from_the_bundled_scenarios(mod, tmp_path):
    f = tmp_path / "ScenariosData.json"
    f.write_text(json.dumps({"scenarios": [{"scenarioId": "SC-001"}, {"scenarioId": "SC-003"}, {}]}))
    assert mod.template_ids(f) == {"SC-001", "SC-003"}


def test_the_real_template_file_is_found(mod):
    assert "SC-001" in mod.template_ids()


def test_owner_is_required_and_must_be_an_email(mod):
    with pytest.raises(SystemExit):
        mod.main(["--owner", "not-an-email"])
