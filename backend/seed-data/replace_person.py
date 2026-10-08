#!/usr/bin/env python3
"""
Replace one person's name and email with the demo user in the live tables.

The bundled demo data used a real colleague's details, and the seed script
copied them into DynamoDB. Re-seeding cannot fix every row (in
user-list-members the email is part of the row key), so this rewrites exactly
the rows that mention the person, in the tables the seed and the wizard fill.

Dry run by default: it lists every row it would change and writes nothing.

    AWS_PROFILE=vshield python replace_person.py --old-email someone@vodafone.com --old-name "Some Name"
    AWS_PROFILE=vshield python replace_person.py --old-email ... --old-name ... --apply

The person's details are passed on the command line so they are never committed.
"""
import argparse
import re

REGION = "ap-south-1"
NAME_PREFIX = "security-awareness-poc"

# Keep in step with DEMO_USER in frontend/VShield/src/appConfig.js.
NEW_NAME = "VOIS Demo User"
NEW_EMAIL = "vois.demo.user@vodafone.com"

# Table (without prefix) -> its key attributes, as declared in infra/terraform.
TABLES = {
    "users": ["UserID"],
    "gamification-rules": ["EventOperation"],
    "user-list-members": ["userListId", "email"],
    "campaigns-catalog": ["campaignId"],
    "campaigns": ["campaignId"],
}


def replace_in(value, old_email, old_name, new_email=NEW_EMAIL, new_name=NEW_NAME):
    """Swap the old email and name for the new ones, at any depth, ignoring case."""
    if isinstance(value, str):
        out = re.sub(re.escape(old_email), new_email, value, flags=re.IGNORECASE)

        def name_for(match):
            # Keep upper-case display names ("HI ABHAY…") upper-case.
            return new_name.upper() if match.group(0).isupper() else new_name

        return re.sub(re.escape(old_name), name_for, out, flags=re.IGNORECASE)
    if isinstance(value, dict):
        return {k: replace_in(v, old_email, old_name, new_email, new_name) for k, v in value.items()}
    if isinstance(value, list):
        return [replace_in(v, old_email, old_name, new_email, new_name) for v in value]
    if isinstance(value, set):
        return {replace_in(v, old_email, old_name, new_email, new_name) for v in value}
    return value


def plan_change(item, key_attrs, old_email, old_name):
    """None if the row does not mention the person, else (new_item, key_changed)."""
    new_item = replace_in(item, old_email, old_name)
    if new_item == item:
        return None
    key_changed = any(new_item.get(k) != item.get(k) for k in key_attrs)
    return new_item, key_changed


def changed_fields(old, new):
    return sorted(k for k in new if new.get(k) != old.get(k))


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
    parser.add_argument("--old-email", required=True)
    parser.add_argument("--old-name", required=True)
    parser.add_argument("--apply", action="store_true", help="write the changes (default: dry run)")
    args = parser.parse_args(argv)

    import boto3  # imported here so the helpers above can be tested without AWS

    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    total = 0
    for short, key_attrs in TABLES.items():
        table = dynamodb.Table(f"{NAME_PREFIX}-{short}")
        for item in scan_all(table):
            change = plan_change(item, key_attrs, args.old_email, args.old_name)
            if not change:
                continue
            new_item, key_changed = change
            key = {k: item[k] for k in key_attrs}
            total += 1
            note = " (row key changes: written as a new row, old row deleted)" if key_changed else ""
            print(f"  {short} {key}: {', '.join(changed_fields(item, new_item))}{note}")
            if args.apply:
                table.put_item(Item=new_item)
                if key_changed:
                    table.delete_item(Key=key)

    if args.apply:
        print(f"Updated {total} row(s).")
    else:
        print(f"{total} row(s) would change. Re-run with --apply to write them.")


if __name__ == "__main__":
    main()
