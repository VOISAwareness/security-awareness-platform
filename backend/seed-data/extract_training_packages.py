#!/usr/bin/env python3
"""
Unpack the training packages saved before package-extract existed (or whose
unpacking failed), by starting package-extract for each.

Packages saved from now on are unpacked when they are saved; this is for the
ones already in the table. A package is picked when its ContentStatus is
missing, PENDING or FAILED (--all: every package). Nothing is started
without --write; package-extract runs on its own, and the rows show READY
(or FAILED with a reason) within a minute or two.

Usage (from the repo root):
    python backend/seed-data/extract_training_packages.py            # list them
    python backend/seed-data/extract_training_packages.py --write    # start them
"""
import argparse
import json

REGION = "ap-south-1"
PREFIX = "security-awareness-poc"
TO_DO = {None, "PENDING", "FAILED"}


def scan_all(table):
    rows, start = [], None
    while True:
        page = table.scan(**({"ExclusiveStartKey": start} if start else {}))
        rows.extend(page.get("Items", []))
        start = page.get("LastEvaluatedKey")
        if not start:
            return rows


def to_extract(rows, every=False):
    """The packages to unpack, by id."""
    picked = [r for r in rows if r.get("PackageKey") and (every or r.get("ContentStatus") in TO_DO)]
    return sorted(picked, key=lambda r: str(r.get("PackageID")))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--write", action="store_true", help="start package-extract (default: only list)")
    parser.add_argument("--all", action="store_true", help="every package, READY ones too")
    parser.add_argument("--prefix", default=PREFIX, help=f"resource name prefix (default {PREFIX})")
    parser.add_argument("--region", default=REGION, help=f"AWS region (default {REGION})")
    args = parser.parse_args(argv)
    import boto3

    table = boto3.resource("dynamodb", region_name=args.region).Table(f"{args.prefix}-training-packages")
    rows = to_extract(scan_all(table), every=args.all)
    print(f"{table.name}: {len(rows)} packages to unpack")
    for r in rows:
        print(f"  {r['PackageID']:8} {str(r.get('ContentStatus') or '-'):10} {r.get('Size', ''):>9}  {r.get('PackageName', '')}")
    if not args.write:
        print("Dry run: nothing started. Add --write to start them.")
        return
    client = boto3.client("lambda", region_name=args.region)
    for r in rows:
        client.invoke(
            FunctionName=f"{args.prefix}-package-extract",
            InvocationType="Event",
            Payload=json.dumps({"packageId": r["PackageID"]}).encode("utf-8"),
        )
    print(f"Started {len(rows)}. Check in a minute or two: GET /training/packages shows ContentStatus.")


if __name__ == "__main__":
    main()
