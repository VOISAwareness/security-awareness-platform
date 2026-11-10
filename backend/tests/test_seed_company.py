"""Tests for seed-data/seed_company.py: the fake company's rows (no AWS calls)."""
import datetime as dt
import importlib.util
import os
from collections import Counter
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
TODAY = dt.date(2026, 11, 10)


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def mod():
    return load("seed_company", BACKEND / "seed-data" / "seed_company.py")


@pytest.fixture(scope="module")
def tables(mod):
    return mod.build(TODAY, 800, 2026)


def test_the_same_seed_gives_the_same_company(mod, tables):
    assert mod.build(TODAY, 800, 2026) == tables
    assert mod.build(TODAY, 800, 7)["users"] != tables["users"]


def test_800_people_each_once_with_addresses_that_cannot_get_mail(tables):
    users = tables["users"]
    assert len(users) == 800
    assert len({u["UserID"] for u in users}) == len({u["UserEMailID"] for u in users}) == 800
    assert all(u["UserEMailID"].endswith(".example") and u["UserEMailID"] == u["UserEMailID"].lower() for u in users)
    roles = Counter(u["role"] for u in users)
    assert roles["Admin"] == 4 and roles["Regular User"] == 800 - 33
    assert len({u["Department"] for u in users}) == 16


def test_every_row_is_marked_and_has_its_table_keys(mod, tables):
    assert set(tables) == set(mod.TABLES)
    for short, rows in tables.items():
        keys = mod.TABLES[short][0]
        assert rows, short
        assert all(r.get("seed") is True and all(r.get(k) for k in keys) for r in rows), short
        assert len({tuple(r[k] for k in keys) for r in rows}) == len(rows), f"{short}: duplicate keys"


def test_no_seeded_campaign_can_be_picked_up_and_sent(tables):
    statuses = Counter(c["status"] for c in tables["campaigns"])
    assert "APPROVED" not in statuses and "SENDING" not in statuses
    assert statuses["SENT"] >= 40
    assert all("userListId" not in c for c in tables["campaigns"])


def test_no_tracking_token_or_typed_secret_is_stored(tables):
    for short in ("recipients", "events"):
        for row in tables[short]:
            assert not {"trackingToken", "trackingUrl", "password", "otp"} & set(row)


def test_a_campaigns_counts_match_its_recipients_and_events(tables):
    campaign = next(c for c in tables["campaigns"] if c["status"] == "SENT")
    mine = [r for r in tables["recipients"] if r["campaignId"] == campaign["campaignId"]]
    events = Counter(e["eventType"] for e in tables["events"] if e["campaignId"] == campaign["campaignId"])
    counts = campaign["counts"]
    assert counts["sent"] == len(mine)
    assert counts["delivered"] == sum("deliveredAt" in r for r in mine)
    assert counts.get("opened", 0) == sum("openedAt" in r for r in mine) == events["OPEN"]
    assert counts.get("clicked", 0) == sum("clickedAt" in r for r in mine) == events["CLICK"]
    assert counts.get("compromised", 0) == sum("compromisedAt" in r for r in mine) == events["COMPROMISE"]
    assert counts.get("reported", 0) == sum("reportedAt" in r for r in mine) == events["REPORT"]


def test_things_happen_in_order(tables):
    for r in tables["recipients"]:
        if "clickedAt" in r:
            assert r["sentAt"] <= r["openedAt"] <= r["clickedAt"]
        if "compromisedAt" in r:
            assert r["clickedAt"] <= r["compromisedAt"]
        if "reportedAt" in r:
            assert r["openedAt"] <= r["reportedAt"]


def test_the_company_daily_totals_add_up_to_the_recipients(tables):
    company = [s for s in tables["stats-daily"] if s["scope"] == "COMPANY"]
    recipients = tables["recipients"]
    assert sum(s.get("sent", 0) for s in company) == len(recipients)
    assert sum(s.get("clicked", 0) for s in company) == sum("clickedAt" in r for r in recipients)
    assert sum(s.get("reported", 0) for s in company) == sum("reportedAt" in r for r in recipients)
    depts = [s for s in tables["stats-daily"] if s["scope"].startswith("DEPT#") and "#TYPE#" not in s["scope"]]
    assert sum(s.get("sent", 0) for s in depts) == len(recipients)
    assignments = tables["training-assignments"]
    assert sum(s.get("trainingAssigned", 0) for s in company) == len(assignments)
    assert sum(s.get("trainingCompleted", 0) for s in company) == sum(a["status"] == "COMPLETED" for a in assignments)


def test_training_after_a_click_points_back_at_it(mod, tables):
    assignments = {(a["owner"], a["assignmentId"]): a for a in tables["training-assignments"]}
    linked = [r for r in tables["recipients"] if "trainingAssignmentId" in r]
    assert linked
    for r in linked:
        a = assignments[(r["recipientEmail"], r["trainingAssignmentId"])]
        assert a["source"] == "ASSIGNED" and a["campaignId"] == r["campaignId"] and "clickedAt" in r
    sources = Counter(a["source"] for a in assignments.values())
    assert sources["ASSIGNED"] and sources["VOLUNTARY"]
    for a in assignments.values():
        if "quizScore" in a:
            assert a["quizPassed"] == (a["quizScore"] >= 80) == (a["status"] == "COMPLETED") == ("certificateId" in a)
            assert a["videosWatched"] == mod.PATH_VIDEOS[a["TrainingPathID"]]  # the quiz follows every video
        if a["status"] == "COMPLETED":
            assert a["assignedAt"] <= a["startedAt"] <= a["completedAt"]
        else:
            assert "completedAt" not in a  # a failed quiz leaves the training open


def test_ledger_totals_follow_the_rules_and_keep_the_latest_entries(mod, tables):
    by_owner = {}
    for row in tables["points-ledger"]:
        by_owner.setdefault(row["owner"], []).append(row)
    for rows in by_owner.values():
        total = next(r for r in rows if r["entryId"] == mod.TOTAL)
        entries = [r for r in rows if r["entryId"] != mod.TOTAL]
        assert total["board"] == mod.BOARD and 1 <= len(entries) <= mod.HISTORY
        assert all(e["delta"] == mod.RULES[e["rule"]] and e["delta"] for e in entries)
        if total["entries"] <= mod.HISTORY:
            assert total["points"] == sum(e["delta"] for e in entries)


def test_snapshots_cover_everyone_each_month_and_today(mod, tables):
    days = Counter(s["snapshotDay"] for s in tables["people-snapshots"])
    assert len(days) == 13 and set(days.values()) == {800}
    assert TODAY.isoformat() in days and "2026-11-01" in days and "2025-12-01" in days
    latest = {s["owner"]: s for s in tables["people-snapshots"] if s["snapshotDay"] == TODAY.isoformat()}
    totals = {r["owner"]: r["points"] for r in tables["points-ledger"] if r["entryId"] == mod.TOTAL}
    for owner, snap in latest.items():
        assert snap["points"] == totals.get(owner, 0)
        assert snap["levelId"] == mod.level_id(snap["points"])
    score = mod.risk_score([s["riskTier"] for s in latest.values()])
    assert 10 <= score <= 30  # near Insights' target of 20


def test_tiers_follow_insights_rules(mod):
    assert mod.tier_of(clicks=0, compromises=0, reports=2) == "low"
    assert mod.tier_of(clicks=0, compromises=0, reports=0) == "moderate"
    assert mod.tier_of(clicks=1, compromises=0, reports=3) == "moderate"
    assert mod.tier_of(clicks=2, compromises=0, reports=3) == "high"
    assert mod.tier_of(clicks=1, compromises=1, reports=3) == "critical"
    assert mod.risk_score(["low", "critical"]) == 50.0


def test_levels_and_rules_agree_with_the_live_functions(mod):
    os.environ.setdefault("TABLE_PREFIX", "t")
    os.environ.setdefault("AWS_DEFAULT_REGION", "ap-south-1")
    api = load("reference_api_for_seed", BACKEND / "reference-api" / "lambda_function.py")
    assert [(lv["id"], lv["min"], lv["max"]) for lv in api.LEVELS] == list(mod.LEVEL_BANDS)
    engine = load("points_engine_for_seed", BACKEND / "points-engine" / "lambda_function.py")
    assert mod.BOARD == engine.BOARD and mod.TOTAL == engine.TOTAL
    assert set(mod.EVENT_RULE.items()) <= set(engine.EVENT_RULES.items())


def test_a_dry_run_writes_nothing(mod, capsys):
    mod.main(["--today", "2026-11-10", "--people", "40"])
    out = capsys.readouterr().out
    assert "users: 40 rows" in out and "Dry run: nothing written" in out
