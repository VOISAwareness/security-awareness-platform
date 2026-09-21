"""
campaigns-api: campaign lifecycle CRUD + list.

The wizard's "draft" is simply a campaign row with status = DRAFT, so the
existing approval Lambda (submit/approve/reject) continues to own the state
machine. This function owns create / read / update / delete / list.

Deliberate safeguards (see vault note 18, mapped from the frontend):
- The server owns campaignId, createdAt, updatedAt and status. The UI previously
  generated `CAMP-<last 5 digits of Date.now()>`, which collides.
- `loadedData` (a full copy of the recipient list, including every user row) is
  never persisted; only selectedListId/selectedListName are kept and members are
  resolved server-side at send time.
- DynamoDB items are capped at 400 KB. `emailBody` / `landingPageContent` are
  editor blobs that can inline base64 images, so oversized writes are rejected
  with a clear message instead of an opaque DynamoDB error.
- Campaigns can only be edited while DRAFT or REJECTED.
"""
import decimal
import json
import os
import uuid
from datetime import UTC, datetime

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

TABLE_PREFIX = os.environ["TABLE_PREFIX"]
dynamodb = boto3.resource("dynamodb")
campaigns = dynamodb.Table(f"{TABLE_PREFIX}-campaigns")

# DynamoDB hard limit is 400 KB per item; leave headroom for attributes we add.
MAX_ITEM_BYTES = 380 * 1024

# Fields the client may not set — the server owns these.
SERVER_OWNED = {"campaignId", "createdAt", "updatedAt", "status"}

# Never persisted: a denormalised copy of the whole recipient list.
STRIPPED = {"loadedData"}

EDITABLE_STATUSES = {"DRAFT", "REJECTED"}


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def ok(data, **extra):
    return respond(200, {"data": data, **extra})


def err(status, message):
    return respond(status, {"error": {"message": message}})


def now_iso():
    return datetime.now(UTC).isoformat()


def parse_body(event):
    raw = event.get("body")
    if not raw:
        return {}
    return raw if isinstance(raw, dict) else json.loads(raw)


def clean_input(body):
    """Drop server-owned and never-persisted fields from client input."""
    return {
        k: v
        for k, v in body.items()
        if k not in SERVER_OWNED and k not in STRIPPED
    }


def too_large(item):
    """Return the offending size in bytes if the item exceeds the DynamoDB cap."""
    size = len(json.dumps(item, cls=DecimalEncoder).encode("utf-8"))
    return size if size > MAX_ITEM_BYTES else 0


def size_error(size):
    return err(
        413,
        (
            f"Campaign is too large to save ({size // 1024} KB; limit "
            f"{MAX_ITEM_BYTES // 1024} KB). This usually means images were pasted "
            "into the email or landing page as embedded data. Link to images "
            "instead of embedding them."
        ),
    )


def get_campaign(campaign_id):
    return campaigns.get_item(Key={"campaignId": campaign_id}).get("Item")


def lambda_handler(event, context):
    route = event.get("routeKey", "")
    params = event.get("pathParameters") or {}
    qs = event.get("queryStringParameters") or {}

    try:
        if route == "GET /campaigns":
            limit = min(int(qs.get("limit", 100)), 100)
            status = qs.get("status")
            if status:
                # status-index keeps the hub and approvals queue off a full scan.
                resp = campaigns.query(
                    IndexName="status-index",
                    KeyConditionExpression=Key("status").eq(status),
                    ScanIndexForward=False,
                    Limit=limit,
                )
            else:
                resp = campaigns.scan(Limit=limit)
            items = resp.get("Items", [])
            items.sort(key=lambda c: str(c.get("createdAt", "")), reverse=True)
            return ok(items, count=len(items))

        if route == "POST /campaigns":
            body = clean_input(parse_body(event))
            created = now_iso()
            item = {
                **body,
                "campaignId": f"CMP-{uuid.uuid4().hex[:10]}",
                "status": "DRAFT",
                "createdAt": created,
                "updatedAt": created,
            }
            oversized = too_large(item)
            if oversized:
                return size_error(oversized)
            campaigns.put_item(Item=item)
            return respond(201, {"data": item})

        if route == "GET /campaigns/{campaignId}":
            item = get_campaign(params["campaignId"])
            return ok(item) if item else err(404, "Campaign not found")

        if route == "PUT /campaigns/{campaignId}":
            existing = get_campaign(params["campaignId"])
            if not existing:
                return err(404, "Campaign not found")
            current_status = existing.get("status", "DRAFT")
            if current_status not in EDITABLE_STATUSES:
                return err(
                    409,
                    f"Campaign cannot be edited while it is {current_status}. "
                    "Only DRAFT or REJECTED campaigns are editable.",
                )
            merged = {
                **existing,
                **clean_input(parse_body(event)),
                "campaignId": params["campaignId"],
                "status": current_status,
                "createdAt": existing.get("createdAt", now_iso()),
                "updatedAt": now_iso(),
            }
            oversized = too_large(merged)
            if oversized:
                return size_error(oversized)
            campaigns.put_item(Item=merged)
            return ok(merged)

        if route == "DELETE /campaigns/{campaignId}":
            existing = get_campaign(params["campaignId"])
            if existing and existing.get("status") in {"SENDING", "SENT"}:
                return err(
                    409,
                    "A campaign that has been sent cannot be deleted.",
                )
            campaigns.delete_item(Key={"campaignId": params["campaignId"]})
            return respond(204, {"data": None})

        return err(404, f"No handler for route: {route}")

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "AWSClientError")
        print(
            json.dumps(
                {
                    "message": "AWS error",
                    "code": code,
                    "route": route,
                    "operation": e.operation_name,
                    "detail": e.response.get("Error", {}).get("Message", "")[:400],
                }
            )
        )
        return err(500, "A backend error occurred")
    except Exception as e:  # noqa: BLE001
        print(
            json.dumps(
                {"message": "Unhandled error", "type": type(e).__name__, "route": route}
            )
        )
        return err(500, "An unexpected error occurred")
