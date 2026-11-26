#!/usr/bin/env python3
"""
Give the announcement roll-outs saved before retention existed their
expiresAt, so DynamoDB's TTL deletes them too (schema_tables.tf).

reference-api stamps every roll-out it saves with expiresAt: a year after it
ends (its end time, else its start time, else when it was saved). Older
roll-outs have none, so TTL never removes them; the app already leaves them
out of its lists once they are past it. This sets the same expiresAt on
them. Templates are never touched. Nothing is written without --write.

Usage:
    python backfill_announcement_expiry.py                      # dry run
    AWS_PROFILE=vshield python backfill_announcement_expiry.py --write
"""
import argparse
from datetime import UTC, datetime

REGION = "ap-south-1"
TABLE = "security-awareness-poc-announcements"
RETENTION_DAYS = 365  # as reference-api's ANNOUNCEMENT_RETENTION_DAYS


def instant(value):
    """Epoch seconds of an ISO time, else None (as reference-api's)."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=UTC)).timestamp()


def expiry_of(row, days=RETENTION_DAYS):
    """A roll-out's expiresAt, or None for a template or a row with no times."""
    if row.get("kind") != "ROLLOUT":
        return None
    ended = (instant(row.get("announcementEndTime")) or instant(row.get("announcementStartTime"))
             or instant(row.get("createdAt")))
    return int(ended + days * 86400) if ended else None


def missing(rows):
    """(announcementId, expiresAt) for each roll-out that has no expiresAt yet."""
    out = []
    for row in rows:
        if row.get("expiresAt") is None and (expires := expiry_of(row)) is not None:
            out.append((row["announcementId"], expires))
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--write", action="store_true", help="set expiresAt (default: dry run)")
    parser.add_argument("--table", default=TABLE)
    args = parser.parse_args()

    import boto3  # only when run, so the tests need no AWS

    table = boto3.resource("dynamodb", region_name=REGION).Table(args.table)
    rows, kwargs = [], {"ProjectionExpression": "announcementId, kind, expiresAt, announcementEndTime, announcementStartTime, createdAt"}
    while True:
        page = table.scan(**kwargs)
        rows += page.get("Items", [])
        if "LastEvaluatedKey" not in page:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]

    todo = missing(rows)
    for rid, expires in todo:
        when = datetime.fromtimestamp(expires, UTC).strftime("%Y-%m-%d")
        print(f"{rid}: expires {when}{'' if args.write else ' (dry run)'}")
        if args.write:
            table.update_item(
                Key={"announcementId": rid},
                UpdateExpression="SET expiresAt = :e",
                ConditionExpression="attribute_exists(announcementId) AND attribute_not_exists(expiresAt)",
                ExpressionAttributeValues={":e": expires},
            )
    print(f"{len(todo)} roll-out(s) {'updated' if args.write else 'to update; run with --write'}")


if __name__ == "__main__":
    main()
