#!/usr/bin/env python3
"""
Move scenarios, campaigns and announcement templates onto the new Type of
email, Motivator and Target Audience lists.

The lists changed (frontend services/scenarioOptions.js): ten types of
email, twelve motivators, twelve audiences. Rows saved before carry the
older wording ("Credential theft", "Fear, Feedback, Curiosity", "Office
users"); this gives each the new name the team agreed, so filters, Start
fresh and Insights group them with new rows.

- A dropdown's code saved by mistake ("click", "all-employees") becomes its
  name.
- Each value is changed only when the mapping below has an answer for it;
  anything else (a value already new, "Custom", a typed-in motivator) is
  left as it is.
- The value a row had is kept beside it (legacyCampaignType,
  legacyMotivator, legacyTargetAudience), so nothing is lost and a row can
  be put back.
- Each row is written with a condition that its values are still the ones
  read, so an edit made while this runs is never overwritten.
- Nothing is written without --write (the default prints what would
  change). Running it again changes nothing more.

Usage (from the repo root):
    python backend/seed-data/migrate_scenario_options.py            # dry run
    $env:AWS_PROFILE="vshield"; python backend/seed-data/migrate_scenario_options.py --write
"""
import argparse
from collections import Counter

REGION = "ap-south-1"
PREFIX = "security-awareness-poc"
FIELDS = ("campaignType", "motivator", "targetAudience")
# table -> (its key attribute, {field: the attribute it is stored in}).
# Announcement templates name theirs announcementCampaignType and
# announcementTargetAudience, and carry no motivator.
TABLES = {
    "scenarios": ("scenarioId", {f: f for f in FIELDS}),
    "campaigns": ("campaignId", {f: f for f in FIELDS}),
    "announcements": ("announcementId", {"campaignType": "announcementCampaignType",
                                         "targetAudience": "announcementTargetAudience"}),
}
LEGACY_PREFIX = "legacy"

# The new lists (as the frontend's scenarioOptions.js has them).
EMAIL_TYPES = (
    "Click", "Data Entry", "Attachment", "Reply Based", "QR Code", "Download",
    "Consent / Authorization", "Call / Callback", "Payment / Transaction", "Multi-Step",
)
MOTIVATORS = (
    "Fear", "Urgency", "Curiosity", "Authority", "Reward", "Recognition", "Opportunity",
    "Job Function", "Software Update", "Security / Account Alert", "Financial", "Social",
)
AUDIENCES = (
    "All Employees", "Managers / Leaders", "Remote Employees", "Office Employees", "Hybrid Employees",
    "Finance Team", "Legal Team", "CARE Teams", "Business Teams", "HR", "Senior Leadership", "New Joiners",
)

# An older type -> (new type of email, the motivator it stood for). The old
# types mixed what the email asks with what it leans on; the second half
# fills the motivator only where a row has none.
OLD_TYPES = {
    "Credential theft": ("Data Entry", "Security / Account Alert"),
    "Helpdesk impersonation": ("Click", "Authority"),
    "Reward scam": ("Click", "Reward"),
    "Travel scam": ("Click", "Opportunity"),
}
OLD_AUDIENCES = {
    "Office users": "Office Employees",
    "Office Workers": "Office Employees",
    "Remote / Hybrid users": "Hybrid Employees",
    "Finance Workers": "Finance Team",
    "Executives": "Senior Leadership",
}
_MOTIVATOR_BY_LOWER = {m.lower(): m for m in MOTIVATORS}


def _slug(label):
    return "-".join("".join(c if c.isalnum() else " " for c in label.lower()).split())


# A dropdown's code saved by mistake ("click", "all-employees") -> its name.
SLUGS = {
    "campaignType": {_slug(t): t for t in EMAIL_TYPES},
    "targetAudience": {**{_slug(a): a for a in AUDIENCES}, "all": "All Employees"},
}


def new_motivator(value):
    """An older motivator's new name: the first of its words ("Urgency / Fear /
    Security", "Fear, Feedback, Curiosity") that is a motivator now; None
    when none is (it is left as it is)."""
    if not isinstance(value, str) or not value.strip() or value in MOTIVATORS:
        return None
    for part in value.replace(",", "/").split("/"):
        hit = _MOTIVATOR_BY_LOWER.get(part.strip().lower())
        if hit:
            return hit
    return None


def changes(row):
    """{field: new value} for one row: only what the mapping changes."""
    out = {}
    kind = row.get("campaignType")
    if kind in SLUGS["campaignType"]:
        out["campaignType"] = SLUGS["campaignType"][kind]
    if kind in OLD_TYPES:
        out["campaignType"], from_type = OLD_TYPES[kind]
        if not str(row.get("motivator") or "").strip():
            out["motivator"] = from_type
    if "motivator" not in out:
        mapped = new_motivator(row.get("motivator"))
        if mapped:
            out["motivator"] = mapped
    audience = row.get("targetAudience")
    if audience in OLD_AUDIENCES:
        out["targetAudience"] = OLD_AUDIENCES[audience]
    elif audience in SLUGS["targetAudience"]:
        out["targetAudience"] = SLUGS["targetAudience"][audience]
    return out


def table_changes(row, fields):
    """{stored attribute: new value} for a row of a table storing `fields`
    ({field: attribute}): the row read as the three fields, and only the
    fields that table has."""
    found = {f: row[attr] for f, attr in fields.items() if attr in row}
    return {fields[f]: v for f, v in changes(found).items() if f in fields}


def legacy_name(attribute):
    return LEGACY_PREFIX + attribute[0].upper() + attribute[1:]


def update_args(key_name, row, change):
    """update_item arguments: set the new values, keep each old one in its
    legacy field (unless one is kept already), and only if the row still
    has the values it was read with."""
    names, values, sets, conds = {}, {}, [], []
    for i, (field, new) in enumerate(sorted(change.items())):
        names[f"#f{i}"] = field
        values[f":n{i}"] = new
        sets.append(f"#f{i} = :n{i}")
        old = row.get(field)
        if old is None:
            conds.append(f"attribute_not_exists(#f{i})")
        else:
            values[f":o{i}"] = old
            conds.append(f"#f{i} = :o{i}")
            names[f"#l{i}"] = legacy_name(field)
            sets.append(f"#l{i} = if_not_exists(#l{i}, :o{i})")
    return {
        "Key": {key_name: row[key_name]},
        "UpdateExpression": "SET " + ", ".join(sets),
        "ConditionExpression": " AND ".join(conds),
        "ExpressionAttributeNames": names,
        "ExpressionAttributeValues": values,
    }


def scan_all(table):
    rows, start = [], None
    while True:
        page = table.scan(**({"ExclusiveStartKey": start} if start else {}))
        rows.extend(page.get("Items", []))
        start = page.get("LastEvaluatedKey")
        if not start:
            return rows


def migrate(table, key_name, write, fields=None):
    """(planned, written, skipped): the rows' changes, how many were written,
    and the ids changed by someone else meanwhile (left alone)."""
    from botocore.exceptions import ClientError

    fields = fields or {f: f for f in FIELDS}
    planned, written, skipped = [], 0, []
    for row in scan_all(table):
        change = table_changes(row, fields)
        if not change:
            continue
        planned.append((row[key_name], {f: (row.get(f), v) for f, v in change.items()}))
        if not write:
            continue
        try:
            table.update_item(**update_args(key_name, row, change))
            written += 1
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            skipped.append(row[key_name])
    return planned, written, skipped


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--write", action="store_true", help="write the changes (default: only print them)")
    parser.add_argument("--prefix", default=PREFIX, help=f"table name prefix (default {PREFIX})")
    parser.add_argument("--region", default=REGION, help=f"AWS region (default {REGION})")
    args = parser.parse_args(argv)
    import boto3

    db = boto3.resource("dynamodb", region_name=args.region)
    for short, (key_name, fields) in TABLES.items():
        table = db.Table(f"{args.prefix}-{short}")
        planned, written, skipped = migrate(table, key_name, args.write, fields)
        print(f"{table.name}: {len(planned)} rows to change")
        moves = Counter((f, old, new) for _, change in planned for f, (old, new) in change.items())
        for (field, old, new), n in sorted(moves.items(), key=lambda x: (x[0][0], str(x[0][1]))):
            print(f"  {field}: {old!s:40} -> {new}  ({n})")
        if args.write:
            print(f"  written: {written}" + (f"; changed meanwhile, left alone: {', '.join(skipped)}" if skipped else ""))
    if not args.write:
        print("Dry run: nothing written. Add --write to write these changes.")


if __name__ == "__main__":
    main()
