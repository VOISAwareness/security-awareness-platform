"""
recipient-ingest: S3-triggered ingestion of uploaded recipient lists.

Fires on ObjectCreated under uploads/recipients/<listId>/<file>.csv. Parses the
CSV (columns: User Name, Email ID, Department, Location — matching the frontend
bulk-upload template), writes a parsed member cache to DynamoDB, and updates the
list metadata to READY. The raw file remains in S3 as the send source + audit.
"""
import csv
import io
import json
import os
from datetime import UTC, datetime
from urllib.parse import unquote_plus

import boto3

TABLE_PREFIX = os.environ["TABLE_PREFIX"]
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

lists_table = dynamodb.Table(f"{TABLE_PREFIX}-user-lists")
members_table = dynamodb.Table(f"{TABLE_PREFIX}-user-list-members")

# Accept the frontend header names (and a few tolerant aliases).
HEADER_ALIASES = {
    "user name": "userName",
    "name": "userName",
    "email id": "email",
    "email": "email",
    "department": "department",
    "location": "location",
}


def _norm_row(raw):
    out = {}
    for key, value in raw.items():
        if key is None:
            continue
        canon = HEADER_ALIASES.get(key.strip().lower())
        if canon and value is not None:
            out[canon] = value.strip()
    return out


def _list_id_from_key(key):
    # uploads/recipients/<listId>/<file>.csv
    parts = key.split("/")
    return parts[2] if len(parts) >= 4 and parts[0] == "uploads" else None


def lambda_handler(event, context):
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = unquote_plus(record["s3"]["object"]["key"])
        list_id = _list_id_from_key(key)
        if not list_id:
            print(json.dumps({"message": "Skipping unrecognised key", "key": key}))
            continue

        body = s3.get_object(Bucket=bucket, Key=key)["Body"].read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(body))

        count = 0
        dept_counts = {}
        with members_table.batch_writer() as batch:
            for idx, raw in enumerate(reader):
                row = _norm_row(raw)
                if not row.get("email"):
                    continue
                item = {
                    "userListId": list_id,
                    "email": row["email"],
                    "srNo": idx + 1,
                    "userName": row.get("userName", ""),
                    "department": row.get("department", ""),
                    "location": row.get("location", ""),
                }
                batch.put_item(Item=item)
                count += 1
                dept = item["department"] or "Unspecified"
                dept_counts[dept] = dept_counts.get(dept, 0) + 1

        breakdown = [{"dept": d, "count": c} for d, c in sorted(dept_counts.items())]
        now = datetime.now(UTC).isoformat()
        lists_table.update_item(
            Key={"userListId": list_id},
            UpdateExpression=(
                "SET #s = :ready, totalUsers = :n, departmentBreakdown = :b, "
                "s3Key = :k, s3Bucket = :bkt, updatedAt = :t"
            ),
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":ready": "READY",
                ":n": count,
                ":b": breakdown,
                ":k": key,
                ":bkt": bucket,
                ":t": now,
            },
        )
        print(
            json.dumps(
                {
                    "message": "Ingested recipient list",
                    "listId": list_id,
                    "members": count,
                    "key": key,
                    "requestId": context.aws_request_id,
                }
            )
        )

    return {"statusCode": 200}
