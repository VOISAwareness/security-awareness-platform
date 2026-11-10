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
- Cancel (PENDING_APPROVAL or APPROVED, before it starts -> CANCELLED) and
  reinvoke (CANCELLED -> DRAFT) are conditional writes, so a campaign the
  sender has already locked (APPROVED -> SENDING) can never be cancelled.
- GET /campaigns/{id}/results lists each recipient's outcome (opened, clicked,
  gave details, reported, trained). Tracking tokens and URLs never leave the
  table.
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
recipients_table = dynamodb.Table(f"{TABLE_PREFIX}-recipients")
users_table = dynamodb.Table(f"{TABLE_PREFIX}-users")
assignments_table = dynamodb.Table(f"{TABLE_PREFIX}-training-assignments")

# DynamoDB hard limit is 400 KB per item; leave headroom for attributes we add.
MAX_ITEM_BYTES = 380 * 1024

# Fields the client may not set — the server owns these.
SERVER_OWNED = {"campaignId", "createdAt", "updatedAt", "status"}

# Never persisted: a denormalised copy of the whole recipient list.
STRIPPED = {"loadedData"}

EDITABLE_STATUSES = {"DRAFT", "REJECTED"}

# A campaign can be cancelled while it waits for approval or for its start.
CANCELLABLE_STATUSES = ("PENDING_APPROVAL", "APPROVED")
MAX_REASON = 500

# The app's campaign types (frontend services/campaignTypes.js), plus "Custom"
# for Start fresh and the two older names some scenarios still carry.
CAMPAIGN_TYPES = frozenset({
    "Data Entry", "Click", "Credential theft", "Helpdesk impersonation", "Reward scam", "Travel scam",
    "Custom", "Phishing Simulation", "Social Engineering",
})

# What GET /campaigns/{id}/results returns of each recipient row. Never the
# tracking token, its URL or fingerprint.
RESULT_FIELDS = (
    "recipientId", "recipientName", "recipientEmail", "department", "country", "sendStatus",
    "sentAt", "deliveredAt", "openedAt", "clickedAt", "compromisedAt", "reportedAt",
)


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


def type_problem(body):
    """Why the body's campaignType is refused, or None."""
    if "campaignType" not in body or body["campaignType"] in (None, ""):
        return None
    if body["campaignType"] not in CAMPAIGN_TYPES:
        return f"campaignType must be one of: {', '.join(sorted(CAMPAIGN_TYPES))}"
    return None


def actor_of(body):
    return str(body.get("actor") or "").strip().lower()[:200]


def started(campaign, now):
    """True once the campaign's start time has passed."""
    start = str(campaign.get("startAt") or campaign.get("startTime") or "")
    return bool(start) and start[:19] <= now[:19]


def cancel(campaign_id, body):
    actor = actor_of(body)
    reason = str(body.get("reason") or "").strip()
    if not actor:
        return err(400, "actor is required")
    if not reason:
        return err(400, "A reason for cancelling is required")
    if len(reason) > MAX_REASON:
        return err(400, f"The reason must be at most {MAX_REASON} characters")
    existing = get_campaign(campaign_id)
    if not existing:
        return err(404, "Campaign not found")
    status = existing.get("status")
    if status not in CANCELLABLE_STATUSES:
        return err(409, f"Only a campaign waiting for approval or for its start can be cancelled; this one is {status}.")
    now = now_iso()
    if status == "APPROVED" and started(existing, now):
        return err(409, "This campaign has already started, so it can no longer be cancelled.")
    try:
        updated = campaigns.update_item(
            Key={"campaignId": campaign_id},
            UpdateExpression=(
                "SET #status = :cancelled, cancelledBy = :actor, cancelledAt = :now, "
                "cancellationReason = :reason, cancelledFrom = :from, updatedAt = :now"
            ),
            ConditionExpression="#status = :from",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":cancelled": "CANCELLED", ":actor": actor, ":now": now, ":reason": reason, ":from": status,
            },
            ReturnValues="ALL_NEW",
        )["Attributes"]
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return err(409, "The campaign changed while you were cancelling it. Refresh and try again.")
        raise
    return ok(updated)


def reinvoke(campaign_id, body):
    """A cancelled campaign back to DRAFT, to edit and submit again."""
    actor = actor_of(body)
    if not actor:
        return err(400, "actor is required")
    now = now_iso()
    try:
        updated = campaigns.update_item(
            Key={"campaignId": campaign_id},
            UpdateExpression=(
                "SET #status = :draft, reinvokedBy = :actor, reinvokedAt = :now, updatedAt = :now "
                "REMOVE approvedBy, approvedAt, submittedBy, submittedAt"
            ),
            ConditionExpression="#status = :cancelled",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":draft": "DRAFT", ":cancelled": "CANCELLED", ":actor": actor, ":now": now},
            ReturnValues="ALL_NEW",
        )["Attributes"]
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            if not get_campaign(campaign_id):
                return err(404, "Campaign not found")
            return err(409, "Only a cancelled campaign can be reinvoked.")
        raise
    return ok(updated)


def query_all(table, **kwargs):
    rows = []
    while True:
        resp = table.query(**kwargs)
        rows.extend(resp.get("Items", []))
        if not resp.get("LastEvaluatedKey"):
            return rows
        kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]


def people_by_email(emails):
    """email -> (department, country) for recipients whose row has neither
    (campaigns sent before the row carried them). One read per person."""
    found = {}
    for email in sorted(emails)[:1000]:
        rows = users_table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("UserEMailID").eq(email),
            Limit=1,
        ).get("Items", [])
        if rows:
            found[email] = (rows[0].get("Department"), rows[0].get("Country"))
    return found


def completed_trainings(rows):
    """The (owner, assignmentId) pairs among the rows' trainings that were
    completed with the quiz passed (a failed quiz is not trained)."""
    keys = sorted({(str(r["recipientEmail"]).strip().lower(), r["trainingAssignmentId"]) for r in rows
                   if r.get("trainingAssignmentId") and r.get("recipientEmail")})
    done = set()
    for i in range(0, len(keys), 100):
        batch = [{"owner": o, "assignmentId": a} for o, a in keys[i:i + 100]]
        request = {assignments_table.name: {"Keys": batch, "ProjectionExpression": "#o, assignmentId, #s, quizPassed",
                                            "ExpressionAttributeNames": {"#o": "owner", "#s": "status"}}}
        while request:
            resp = dynamodb.batch_get_item(RequestItems=request)
            for item in resp.get("Responses", {}).get(assignments_table.name, []):
                if item.get("status") == "COMPLETED" and item.get("quizPassed") is True:
                    done.add((item["owner"], item["assignmentId"]))
            request = resp.get("UnprocessedKeys") or None
    return done


def result_row(r, people, done):
    email = str(r.get("recipientEmail") or r.get("email") or "").strip().lower()
    dept, country = people.get(email, (None, None))
    row = {k: r[k] for k in RESULT_FIELDS if r.get(k) not in (None, "")}
    row["recipientEmail"] = email
    row["department"] = r.get("department") or dept or "Unknown"
    row["country"] = r.get("country") or country or "Unknown"
    row.update(
        opened=bool(r.get("openedAt") or r.get("clickedAt") or r.get("reportedAt")),
        clicked=bool(r.get("clickedAt")),
        compromised=bool(r.get("compromisedAt")),
        reported=bool(r.get("reportedAt")),
        trained=(email, r.get("trainingAssignmentId")) in done,
    )
    return row


def results(campaign_id):
    campaign = get_campaign(campaign_id)
    if not campaign:
        return err(404, "Campaign not found")
    rows = query_all(recipients_table, KeyConditionExpression=Key("campaignId").eq(campaign_id))
    missing = {str(r.get("recipientEmail") or "").lower() for r in rows if not r.get("department")}
    people = people_by_email(missing - {""}) if missing else {}
    done = completed_trainings(rows)
    out = sorted((result_row(r, people, done) for r in rows), key=lambda x: x["recipientEmail"])
    count = lambda key: sum(1 for x in out if x[key])  # noqa: E731
    summary = {
        "recipients": len(out),
        "delivered": sum(1 for x in out if x.get("sendStatus") != "FAILED"),
        "opened": count("opened"), "clicked": count("clicked"), "compromised": count("compromised"),
        "reported": count("reported"), "trained": count("trained"),
    }
    return ok(out, summary=summary, campaignId=campaign_id, status=campaign.get("status"))


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
            problem = type_problem(body)
            if problem:
                return err(400, problem)
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
            # A plain reject is final; only one sent back for changes is edited.
            if current_status == "REJECTED" and existing.get("changesRequested") is not True:
                return err(
                    409,
                    "This campaign was rejected and is closed. Copy it to a new draft to try again.",
                )
            if current_status not in EDITABLE_STATUSES:
                return err(
                    409,
                    f"Campaign cannot be edited while it is {current_status}. "
                    "Only DRAFT or REJECTED campaigns are editable.",
                )
            changes = clean_input(parse_body(event))
            problem = type_problem(changes)
            if problem:
                return err(400, problem)
            merged = {
                **existing,
                **changes,
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

        if route == "GET /campaigns/{campaignId}/results":
            return results(params["campaignId"])

        if route == "POST /campaigns/{campaignId}/cancel":
            return cancel(params["campaignId"], parse_body(event))

        if route == "POST /campaigns/{campaignId}/reinvoke":
            return reinvoke(params["campaignId"], parse_body(event))

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
