#!/usr/bin/env python3
"""
Give the original demo users their roles in the users table.

The login picker used to keep this list in the frontend. Roles now live on
each person's row (`role`), as they will when Active Directory fills the
table, so the 16 demo users who had a role need it written once. Everyone
else can sign in as a Regular User without one.

Nothing is written without --write (the default prints what would change).

Usage:
    python set_legacy_roles.py                       # dry run
    AWS_PROFILE=vshield python set_legacy_roles.py --write
"""
import argparse

REGION = "ap-south-1"
TABLE = "security-awareness-poc-users"

# UserID -> role, as the login screen had them.
ROLES = {
    "VSLD-000006": "Admin",
    "VSLD-000053": "Admin",
    "VSLD-000001": "Campaign Manager",
    "VSLD-000002": "Campaign Manager",
    "VSLD-000003": "Campaign Manager",
    "VSLD-000004": "Campaign Creator",
    "VSLD-000005": "Campaign Creator",
    "VSLD-000007": "Campaign Creator",
    "VSLD-000008": "Campaign Creator",
    "VSLD-000023": "Gamification Engine Manager",
    "VSLD-000039": "Gamification Engine Manager",
    "VSLD-000103": "GMT",
    "VSLD-000104": "GMT",
    "VSLD-000030": "GMT",
    "VSLD-000101": "GMT",
    "VSLD-000102": "GMT",
}


def set_roles(table, write):
    """Set each listed person's role, only on rows that exist. Returns
    (changed, missing) user ids."""
    from botocore.exceptions import ClientError

    changed, missing = [], []
    for user_id, role in ROLES.items():
        if not write:
            changed.append(user_id)
            continue
        try:
            table.update_item(
                Key={"UserID": user_id},
                UpdateExpression="SET #role = :role",
                ConditionExpression="attribute_exists(UserID)",
                ExpressionAttributeNames={"#role": "role"},
                ExpressionAttributeValues={":role": role},
            )
            changed.append(user_id)
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise
            missing.append(user_id)
    return changed, missing


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("--write", action="store_true", help="write the roles (default: only print them)")
    args = parser.parse_args(argv)
    table = None
    if args.write:
        import boto3

        table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE)
    changed, missing = set_roles(table, args.write)
    for user_id in changed:
        print(f"  {user_id}: {ROLES[user_id]}")
    for user_id in missing:
        print(f"  {user_id}: not in the table, skipped")
    print(f"{len(changed)} roles written." if args.write else "Dry run: nothing written. Add --write to write these roles.")


if __name__ == "__main__":
    main()
