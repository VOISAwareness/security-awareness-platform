#!/usr/bin/env python3
"""
Give scenarios created before ownership existed back to the person who made them.

Scenarios saved before the API recorded `createdBy` have no owner, and a row
without one is a fixed template: nobody can edit it in place or delete it.
This sets `createdBy` on the scenarios you name, so they become yours (Edit and
Delete, "Only you" until a sent campaign uses them).

It only touches rows that have no owner yet, and never the bundled templates
(the scenarios in frontend/VShield/src/Pages/Scenarios/ScenariosData.json).
Dry run by default: it lists every scenario without an owner, marks the ones it
would claim, and writes nothing.

    AWS_PROFILE=vshield python claim_scenarios.py --owner you@vodafone.com
    AWS_PROFILE=vshield python claim_scenarios.py --owner you@vodafone.com --ids SC-104,SC-105
    AWS_PROFILE=vshield python claim_scenarios.py --owner you@vodafone.com --ids SC-104,SC-105 --apply

The owner is passed on the command line so no email is committed.
"""
import argparse
import json
from pathlib import Path

REGION = "ap-south-1"
NAME_PREFIX = "security-awareness-poc"
TEMPLATES_FILE = (
    Path(__file__).resolve().parents[2] / "frontend" / "VShield" / "src" / "Pages" / "Scenarios" / "ScenariosData.json"
)


def template_ids(path=TEMPLATES_FILE):
    """The bundled templates' ids: never claimed."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return {str(s.get("scenarioId")) for s in data.get("scenarios", []) if s.get("scenarioId")}


def parse_ids(text):
    return [part.strip() for part in (text or "").split(",") if part.strip()]


def plan_claims(rows, ids, templates):
    """Scenarios without an owner, each with what happens to it:
    [(row, "claim" | "template" | "not selected")], plus the requested ids not
    found among them. Rows that already have an owner are left out."""
    wanted = set(ids)
    plan = []
    for row in sorted(rows, key=lambda r: str(r.get("scenarioId"))):
        if str(row.get("createdBy") or "").strip():
            continue
        sid = str(row.get("scenarioId"))
        if sid in templates:
            action = "template"
        elif sid in wanted:
            action = "claim"
        else:
            action = "not selected"
        plan.append((row, action))
    found = {str(row.get("scenarioId")) for row, _ in plan}
    missing = sorted(wanted - found)
    return plan, missing


def scan_all(table):
    kwargs = {}
    while True:
        page = table.scan(**kwargs)
        yield from page.get("Items", [])
        if "LastEvaluatedKey" not in page:
            return
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--owner", required=True, help="email of the person the scenarios belong to")
    parser.add_argument("--ids", default="", help="comma-separated scenario ids to claim")
    parser.add_argument("--apply", action="store_true", help="write the changes (default: dry run)")
    args = parser.parse_args(argv)

    owner = args.owner.strip().lower()
    if "@" not in owner:
        parser.error("--owner must be an email address")

    import boto3  # imported here so the helpers above can be tested without AWS
    from botocore.exceptions import ClientError

    table = boto3.resource("dynamodb", region_name=REGION).Table(f"{NAME_PREFIX}-scenarios")
    plan, missing = plan_claims(scan_all(table), parse_ids(args.ids), template_ids())

    print(f"Scenarios without an owner ({len(plan)}):")
    for row, action in plan:
        print(f"  {row.get('scenarioId')}  {row.get('scenarioName', '')!r}  CreatedOn={row.get('CreatedOn', '')}  -> {action}")
    for sid in missing:
        print(f"  {sid}: not found among scenarios without an owner (already owned, or no such id) -> skipped")

    to_claim = [row for row, action in plan if action == "claim"]
    if not args.apply:
        print(f"{len(to_claim)} scenario(s) would be given to {owner}. Re-run with --apply to write them.")
        return

    claimed = 0
    for row in to_claim:
        try:
            table.update_item(
                Key={"scenarioId": row["scenarioId"]},
                UpdateExpression="SET createdBy = :owner",
                ConditionExpression="attribute_exists(scenarioId) AND attribute_not_exists(createdBy)",
                ExpressionAttributeValues={":owner": owner},
            )
            claimed += 1
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            print(f"  {row['scenarioId']}: got an owner meanwhile -> skipped")
    print(f"Gave {claimed} scenario(s) to {owner}.")


if __name__ == "__main__":
    main()
