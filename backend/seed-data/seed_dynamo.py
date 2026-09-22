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
import datetime
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


# Workflow status each demo campaign should land in. The bundled JSON only has
# lifecycle phases (Completed/Live/Upcoming), which are NOT workflow statuses —
# see frontend/VShield/src/services/campaignStatus.js. Two rows are parked in
# PENDING_APPROVAL and one in REJECTED so the approvals queue has real content.
CAMPAIGN_STATUS_PLAN = {
    "CAMP-001": "SENT",
    "CAMP-002": "SENT",
    "CAMP-003": "PENDING_APPROVAL",
    "CAMP-004": "SENT",
    "CAMP-005": "APPROVED",
    "CAMP-006": "REJECTED",
    "CAMP-007": "SENT",
    "CAMP-008": "PENDING_APPROVAL",
    "CAMP-009": "APPROVED",
    "CAMP-010": "SENT",
}


_USER_LIST_CACHE = {}


def user_list_lookup():
    """{listId: {name, count}} for both saved lists and synced DLs."""
    if _USER_LIST_CACHE:
        return _USER_LIST_CACHE
    data = load("Pages/UserDLs/UserDLsData.json")
    for row in data.get("savedUserLists", []):
        _USER_LIST_CACHE[row.get("id")] = {
            "name": row.get("name", ""),
            "count": row.get("totalUsers") or len(row.get("users", [])),
        }
    for row in data.get("syncedDistributionLists", []):
        _USER_LIST_CACHE[row.get("dlId")] = {
            "name": row.get("dlName", ""),
            "count": row.get("totalUsers") or len(row.get("members", [])),
        }
    return _USER_LIST_CACHE


def _iso(dt):
    return dt.replace(tzinfo=datetime.UTC).isoformat()


def seed_campaigns(only=None):
    """Seed the LIVE campaigns table from the catalogue's dummy campaigns.

    Unlike the SIMPLE tables this one REMAPS field names, because the live table
    is written by the wizard (campaignTitle/emailSubject/senderEmailId) while the
    bundled JSON uses PascalCase. Dates are rebased around today so that the
    Live/Upcoming rows are genuinely live/upcoming rather than stuck in the past.
    """
    if only and only != "campaigns":
        return

    now = datetime.datetime.now(datetime.UTC)
    rows = load("Pages/Campaigns/CampaignsData.json")["campaigns"]
    items = []

    for row in rows:
        cid = row["campaignId"]
        status = CAMPAIGN_STATUS_PLAN.get(cid, "DRAFT")
        phase = row.get("campaignStatus")

        # Rebase the window so the phase the demo data intended still holds.
        if phase == "Upcoming":
            start, end = now + datetime.timedelta(days=6), now + datetime.timedelta(days=13)
        elif phase == "Live":
            start, end = now - datetime.timedelta(days=2), now + datetime.timedelta(days=5)
        else:
            start, end = now - datetime.timedelta(days=24), now - datetime.timedelta(days=17)

        # Never let an Upcoming campaign claim it was created/submitted in the
        # future: the window moves forward, the paper trail cannot.
        created = min(start - datetime.timedelta(days=5), now - datetime.timedelta(days=3))

        item = {
            "campaignId": cid,
            "status": status,
            "campaignTitle": row.get("CampaignTitle", ""),
            "campaignDescription": row.get("CampaignDescription", ""),
            "startTime": _iso(start),
            "endTime": _iso(end),
            "autoEndPostSending": row.get("AutoEndPostCompletion") == "Yes",
            "senderEmailId": row.get("SenderEmailID", ""),
            "senderName": row.get("SenderName", ""),
            "emailSubject": row.get("EmailSubject", ""),
            "emailBody": row.get("EmailBody", ""),
            "scenarioId": row.get("ScenarioID", ""),
            "landingPageId": row.get("LandingPageID", ""),
            "trainingId": row.get("TrainingPathID", ""),
            "isTestCampaign": row.get("TestCampaign") == "Yes",
            "createdAt": _iso(created),
            "updatedAt": _iso(created),
            "createdBy": "demo-seed",
        }

        recipients = row.get("RecipientDetails") or {}
        if row.get("RecipientGroupType") == "UserList":
            list_id = recipients.get("UserListID", "")
            item["selectedListId"] = list_id
            # Denormalise the name and size onto the campaign. An approver needs
            # to know WHO receives a campaign, and a bare id ("ul-002") does not
            # tell them; without this every screen has to resolve it separately.
            meta = user_list_lookup().get(list_id)
            if meta:
                item["selectedListName"] = meta["name"]
                item["recipientCount"] = meta["count"]
        elif recipients:
            item["recipientDetails"] = recipients

        # Workflow breadcrumbs, so the approvals screen and audit trail read true.
        if status != "DRAFT":
            submitted = created + datetime.timedelta(hours=6)
            item["submittedBy"] = "campaign.manager@vodafone.com"
            item["submittedAt"] = _iso(submitted)
            item["submissionComments"] = "Ready for review"
            item["updatedAt"] = _iso(submitted)

            if status in ("APPROVED", "SENT", "SENDING"):
                approved = submitted + datetime.timedelta(hours=18)
                item["approvedBy"] = "security.approver@vodafone.com"
                item["approvedAt"] = _iso(approved)
                item["approvalComments"] = "Approved"
                item["updatedAt"] = _iso(approved)
            if status == "SENT":
                item["sentAt"] = _iso(start)
                item["updatedAt"] = _iso(start)
            if status == "REJECTED":
                rejected = submitted + datetime.timedelta(hours=9)
                item["rejectedBy"] = "security.approver@vodafone.com"
                item["rejectedAt"] = _iso(rejected)
                item["rejectionComments"] = (
                    "Sender identity is not appropriate for this audience. "
                    "Please use the internal communications address."
                )
                item["updatedAt"] = _iso(rejected)

        items.append(item)

    put_all("campaigns", items)


def report_counts():
    names = [s[0] for s in SIMPLE] + ["user-lists", "user-list-members", "campaigns"]
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
    seed_campaigns(arg)
    print("Done.")


if __name__ == "__main__":
    main()
