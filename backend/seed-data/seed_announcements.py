#!/usr/bin/env python3
"""
Write the built-in announcement templates (announcement-templates.json, the
six the Announcement gallery always had) to the announcements table, so the
gallery reads them from the backend.

Each becomes a TEMPLATE row whose announcementId is its own
announcementScenarioId, marked seed=true. Re-running overwrites the same six.
Nothing is written without --write.

Usage:
    python seed_announcements.py                      # dry run
    AWS_PROFILE=vshield python seed_announcements.py --write
"""
import argparse
import json
from pathlib import Path

REGION = "ap-south-1"
TABLE = "security-awareness-poc-announcements"
SOURCE = Path(__file__).with_name("announcement-templates.json")
CREATED_AT = "2026-01-02T00:00:00Z"


def template_rows(templates):
    """The table rows for the built-in templates."""
    rows = []
    for t in templates:
        tid = t["announcementScenarioId"]
        rows.append({
            **t,
            "announcementId": tid,
            "kind": "TEMPLATE",
            "status": "ACTIVE",
            "createdBy": "seed",
            "createdAt": CREATED_AT,
            "updatedAt": CREATED_AT,
            "seed": True,
        })
    return rows


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--write", action="store_true", help="write the rows (default: only list them)")
    args = parser.parse_args(argv)
    rows = template_rows(json.loads(SOURCE.read_text(encoding="utf-8")))
    for r in rows:
        print(f"  {r['announcementId']}: {r['announcementScenarioName']}")
    if not args.write:
        print("Dry run: nothing written. Add --write to write these templates.")
        return
    import boto3

    table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE)
    with table.batch_writer() as batch:
        for r in rows:
            batch.put_item(Item=r)
    print(f"{len(rows)} templates written.")


if __name__ == "__main__":
    main()
