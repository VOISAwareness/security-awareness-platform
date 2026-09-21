"""Regression test for the campaign-reader Decimal serialization bug (PR #3)."""
import decimal
import importlib.util
import json
import os
from pathlib import Path

import pytest

MODULE_PATH = (
    Path(__file__).resolve().parents[1] / "campaign-reader" / "lambda_function.py"
)


def _load_module():
    # The Lambda reads config at import time; provide dummy env first.
    os.environ.setdefault("CAMPAIGNS_TABLE", "t")
    os.environ.setdefault("TEMPLATE_BUCKET", "b")
    os.environ.setdefault("TEMPLATE_KEY", "k")
    # boto3 clients are created at import and need a region (none on CI runners).
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    spec = importlib.util.spec_from_file_location("campaign_reader", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "value,expected",
    [(decimal.Decimal("1"), 1), (decimal.Decimal("2.5"), 2.5)],
)
def test_decimal_encoder_serializes_numbers(value, expected):
    module = _load_module()
    encoded = json.dumps({"n": value}, cls=module.DecimalEncoder)
    assert json.loads(encoded)["n"] == expected


def test_build_response_handles_decimal_item():
    module = _load_module()
    resp = module.build_response(200, {"recipientCount": decimal.Decimal("3")})
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["recipientCount"] == 3
