"""Unit tests for seed-data/replace_person.py helpers (no AWS calls)."""
import importlib.util
from decimal import Decimal
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "seed-data" / "replace_person.py"
OLD_EMAIL = "jane.roe@example.com"
OLD_NAME = "Jane Roe"


@pytest.fixture(scope="module")
def mod():
    spec = importlib.util.spec_from_file_location("replace_person", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_replaces_at_any_depth_and_ignores_case(mod):
    item = {
        "campaignId": "CAMP-007",
        "recipientDetails": {"EmailIDsListed": ["a@example.com", "JANE.ROE@example.com"]},
        "note": "Hi jane roe,",
        "points": Decimal("80"),
    }
    out = mod.replace_in(item, OLD_EMAIL, OLD_NAME)
    assert out["recipientDetails"]["EmailIDsListed"] == ["a@example.com", mod.NEW_EMAIL]
    assert out["note"] == f"Hi {mod.NEW_NAME},"
    assert out["points"] == Decimal("80")


def test_upper_case_names_stay_upper_case(mod):
    assert mod.replace_in("HI JANE ROE", OLD_EMAIL, OLD_NAME) == f"HI {mod.NEW_NAME.upper()}"


def test_rows_without_the_person_are_left_alone(mod):
    row = {"UserID": "VSLD-000002", "UserName": "Someone Else", "UserEMailID": "else@example.com"}
    assert mod.plan_change(row, ["UserID"], OLD_EMAIL, OLD_NAME) is None


def test_changing_the_email_key_is_flagged(mod):
    row = {"userListId": "ul-001", "email": OLD_EMAIL, "userName": OLD_NAME}
    new_row, key_changed = mod.plan_change(row, ["userListId", "email"], OLD_EMAIL, OLD_NAME)
    assert key_changed is True
    assert new_row == {"userListId": "ul-001", "email": mod.NEW_EMAIL, "userName": mod.NEW_NAME}


def test_same_key_rows_are_updated_in_place(mod):
    row = {"EventOperation": "Clicked", "ModifiedBy": OLD_EMAIL}
    new_row, key_changed = mod.plan_change(row, ["EventOperation"], OLD_EMAIL, OLD_NAME)
    assert key_changed is False
    assert mod.changed_fields(row, new_row) == ["ModifiedBy"]


def test_demo_user_matches_the_frontend(mod):
    config = (Path(__file__).resolve().parents[2] / "frontend/VShield/src/appConfig.js").read_text()
    assert f"name: '{mod.NEW_NAME}'" in config
    assert f"email: '{mod.NEW_EMAIL}'" in config
