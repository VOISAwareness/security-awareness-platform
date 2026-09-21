"""Unit tests for campaigns-api input hardening (no AWS calls)."""
import importlib.util
import os
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "campaigns-api" / "lambda_function.py"


@pytest.fixture(scope="module")
def mod():
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("campaigns_api", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_clean_input_drops_server_owned_fields(mod):
    """A client must not be able to set its own id or status."""
    cleaned = mod.clean_input(
        {"campaignTitle": "keep", "campaignId": "CAMP-HACKED", "status": "SENT"}
    )
    assert cleaned == {"campaignTitle": "keep"}


def test_clean_input_strips_loaded_data(mod):
    """loadedData embeds the whole recipient list and must never be persisted."""
    cleaned = mod.clean_input(
        {"selectedListId": "ul-1", "loadedData": {"users": [{"email": "a@b.c"}]}}
    )
    assert "loadedData" not in cleaned
    assert cleaned["selectedListId"] == "ul-1"


def test_too_large_flags_oversized_items(mod):
    """Editor blobs with inlined base64 images can exceed the DynamoDB limit."""
    assert mod.too_large({"emailBody": "x"}) == 0
    big = {"landingPageContent": "x" * (mod.MAX_ITEM_BYTES + 1)}
    assert mod.too_large(big) > mod.MAX_ITEM_BYTES


def test_editable_statuses(mod):
    assert mod.EDITABLE_STATUSES == {"DRAFT", "REJECTED"}
