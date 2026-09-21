#!/usr/bin/env python3
"""
Seed DynamoDB tables from the frontend's dummy JSON files.

Loads the React app's static JSON (its current "dummy data") into the matching
DynamoDB tables, preserving field names EXACTLY as the frontend uses them, so the
existing UI keeps working once wired. Floats -> Decimal (DynamoDB requirement).
Idempotent: re-running overwrites items with the same key.

Usage:
    AWS_PROFILE=vshield python seed_dynamo.py           # seed everything
    AWS_PROFILE=vshield python seed_dynamo.py users     # seed one table
    AWS_PROFILE=vshield python seed_dynamo.py --count   # just report table counts
"""
import decimal
import json
import sys
from pathlib import Path

import boto3

REGION = "ap-south-1"
NAME_PREFIX = "security-awareness-poc"
FE = Path(__file__).resolve().parents[2] / "frontend" / "VShield" / "src"

_dynamodb = boto3.resource("dynamodb", region_name=REGION)


def to_decimal(obj):
    if isinstance(obj, float):
        return decimal.Decimal(str(obj))
    if isinstance(obj, list):
        return [to_decimal(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_decimal(v) for k, v in obj.items()}
    return obj


def load(rel):
    with open(FE / rel, encoding="utf-8") as f:
        return json.load(f)


def put_all(table_short, items):
    table = _dynamodb.Table(f"{NAME_PREFIX}-{table_short}")
    n = 0
    with table.batch_writer() as batch:
        for it in items:
            batch.put_item(Item=to_decimal(it))
            n += 1
    print(f"  {NAME_PREFIX}-{table_short}: seeded {n}")
    return n


# (table_short, source_rel, root_key_or_None) — records used verbatim.
SIMPLE = [
    ("users", "MasterUserData.json", None),
    ("sender-identities", "Pages/EmailIDsandDomains/EmailIDsAndDomains.json", None),
    ("scenarios", "Pages/Scenarios/ScenariosData.json", "scenarios"),
    ("landing-pages", "Pages/LandingPageCatalogue/LandingPageCatalogues.json", "landingPages"),
    ("gamification-rules", "Pages/GamificationEngine/GamificationData.json", None),
    ("training-paths", "Pages/Training/TrainingPath.json", None),
    ("training-videos", "Pages/Training/TrainingVideos.json", None),
    ("training-quizzes", "Pages/Training/TrainingQuiz.json", None),
    ("training-certificates", "Pages/Training/TrainingCertificate.json", None),
    ("campaigns-catalog", "Pages/Campaigns/CampaignsData.json", "campaigns"),
]


def seed_simple(only=None):
    for short, rel, root in SIMPLE:
        if only and only != short:
            continue
        data = load(rel)
        records = data[root] if root else data
        put_all(short, records)


def seed_user_lists(only=None):
    """UserDLsData.json has two arrays with different id/name/member fields.
    Flatten to user-lists (metadata + listType) and user-list-members
    (PK userListId, SK email). Member fields preserved verbatim."""
    if only and only not in ("user-lists", "user-list-members"):
        return
    data = load("Pages/UserDLs/UserDLsData.json")
    lists, members = [], []

    for row in data.get("savedUserLists", []):
        row = dict(row)
        kids = row.pop("users", [])
        row["userListId"] = row.get("id")
        row["listType"] = "SAVED"
        lists.append(row)
        for m in kids:
            m = dict(m)
            m["userListId"] = row["userListId"]
            members.append(m)

    for row in data.get("syncedDistributionLists", []):
        row = dict(row)
        kids = row.pop("members", [])
        row["userListId"] = row.get("dlId")
        row["listType"] = "SYNCED"
        lists.append(row)
        for m in kids:
            m = dict(m)
            m["userListId"] = row["userListId"]
            members.append(m)

    if not only or only == "user-lists":
        put_all("user-lists", lists)
    if not only or only == "user-list-members":
        put_all("user-list-members", members)


def report_counts():
    names = [s[0] for s in SIMPLE] + ["user-lists", "user-list-members"]
    for short in names:
        t = _dynamodb.Table(f"{NAME_PREFIX}-{short}")
        try:
            print(f"  {NAME_PREFIX}-{short}: {t.item_count} (approx)")
        except Exception as e:  # noqa: BLE001
            print(f"  {NAME_PREFIX}-{short}: ERROR {e}")


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    if arg == "--count":
        report_counts()
        return
    print("Seeding DynamoDB from frontend dummy data...")
    seed_simple(arg)
    seed_user_lists(arg)
    print("Done.")


if __name__ == "__main__":
    main()
