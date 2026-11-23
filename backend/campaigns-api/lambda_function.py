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
- Cancel (PENDING_APPROVAL, APPROVED or ON_HOLD -> CANCELLED) and reinvoke (CANCELLED
  or SEND_FAILED -> DRAFT) are conditional writes, so a campaign the sender
  has already locked (APPROVED -> SENDING) can never be cancelled. An
  APPROVED campaign whose start has passed but which was never sent (it could
  not be: no recipients, no link...) can still be cancelled, so it is never
  stuck.
- Hold (APPROVED -> ON_HOLD) takes a scheduled campaign off the schedule
  before it starts: the scheduler and the sender only act on APPROVED, so a
  held campaign is never sent. Resume (ON_HOLD -> APPROVED) needs a new start
  (and end, unless the campaign auto-ends after sending) in the future; the
  approval stands, as only the dates change. Reinvoke can take new dates too.
  A held campaign can also be cancelled.
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

# The most campaigns one list returns. Rows carry their email body and landing
# page, and a Lambda response must stay under 6 MB, so the list also stops
# once its rows add up to MAX_LIST_BYTES (and says so with `truncated`).
MAX_LIST = 2000
MAX_LIST_BYTES = 5 * 1024 * 1024

# A campaign can be cancelled while it waits for approval or for its start.
CANCELLABLE_STATUSES = ("PENDING_APPROVAL", "APPROVED", "ON_HOLD")
MAX_REASON = 500

# The type of email a campaign sends: what it asks the person who gets it
# to do. The ten the app offers (the frontend's list of email types; a test
# keeps the two the same once it exists), in the order it shows them.
EMAIL_TYPES = (
    "Click", "Data Entry", "Attachment", "Reply Based", "QR Code", "Download",
    "Consent / Authorization", "Call / Callback", "Payment / Transaction", "Multi-Step",
)
# Names campaigns saved before the ten still carry: the six earlier types,
# "Custom" (Start fresh before it asked for a type) and two older scenario
# names. Accepted so those campaigns can still be edited, cancelled and
# copied; nothing offers them for a new campaign.
LEGACY_TYPES = (
    "Credential theft", "Helpdesk impersonation", "Reward scam", "Travel scam",
    "Custom", "Phishing Simulation", "Social Engineering",
)
CAMPAIGN_TYPES = frozenset(EMAIL_TYPES + LEGACY_TYPES)

# What GET /campaigns/{id}/results returns of each recipient row. Never the
# tracking token, its URL or fingerprint.
# What ?view=summary leaves out of the campaigns list: the email and landing
# page HTML and the cover (about two thirds of the list's bytes).
HEAVY_FIELDS = frozenset({"emailBody", "landingPageContent", "CoverImageID"})

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


def read_all(operation, **kwargs):
    """(items, truncated): every item a query or scan returns, across pages,
    up to MAX_LIST items or MAX_LIST_BYTES of JSON."""
    items, size = [], 0
    while True:
        resp = operation(**kwargs)
        for item in resp.get("Items", []):
            size += len(json.dumps(item, cls=DecimalEncoder))
            if len(items) >= MAX_LIST or size > MAX_LIST_BYTES:
                return items, True
            items.append(item)
        if not resp.get("LastEvaluatedKey"):
            return items, False
        kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]


def get_campaign(campaign_id):
    return campaigns.get_item(Key={"campaignId": campaign_id}).get("Item")


def type_problem(body):
    """Why the body's campaignType is refused, or None."""
    if "campaignType" not in body or body["campaignType"] in (None, ""):
        return None
    if body["campaignType"] not in CAMPAIGN_TYPES:
        return f"campaignType must be one of: {', '.join(EMAIL_TYPES)}"
    return None


def actor_of(body):
    return str(body.get("actor") or "").strip().lower()[:200]


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
    # Still APPROVED means nothing was sent: the sender locks a campaign
    # (APPROVED -> SENDING) before its first email, and this write only
    # succeeds while it is APPROVED. So a campaign whose start passed without
    # sending can be cancelled too, instead of staying scheduled for ever.
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


def parse_instant(value):
    """An ISO instant with its zone ("…Z" / "…+00:00") as an aware datetime, or None."""
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else None


def schedule_from(body, auto_end, required):
    """The new dates in a hold/resume/reinvoke body: (fields to SET, problem).
    The client sends the picked UK wall-clock times (startTime / endTime) and
    their instants (startAt / endAt, UTC). Nothing sent and not required: no
    change. The start must be in the future, the end after the start; the end
    may be left out only when the campaign auto-ends after sending."""
    start_at, end_at = parse_instant(body.get("startAt")), parse_instant(body.get("endAt"))
    if not required and not body.get("startAt") and not body.get("endAt"):
        return {}, None
    if start_at is None or not str(body.get("startTime") or "").strip():
        return None, "A new start date and time is required"
    if start_at <= datetime.now(UTC):
        return None, "The new start must be in the future"
    if end_at is None and not auto_end:
        return None, "A new end date and time is required"
    if end_at is not None and end_at <= start_at:
        return None, "The end must be after the start"
    fields = {
        "startTime": str(body["startTime"]).strip()[:16],
        "startAt": start_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        "timeZone": str(body.get("timeZone") or "Europe/London")[:64],
    }
    if end_at is not None:
        fields["endTime"] = str(body.get("endTime") or "").strip()[:16]
        fields["endAt"] = end_at.astimezone(UTC).isoformat().replace("+00:00", "Z")
    return fields, None


def set_clause(fields, names, values):
    """', a = :a, …' for an UpdateExpression from a dict, filling names/values."""
    parts = []
    for i, (k, v) in enumerate(fields.items()):
        names[f"#f{i}"] = k
        values[f":f{i}"] = v
        parts.append(f"#f{i} = :f{i}")
    return "".join(f", {p}" for p in parts)


def hold(campaign_id, body):
    """A scheduled campaign off the schedule (APPROVED -> ON_HOLD), before it starts."""
    actor = actor_of(body)
    reason = str(body.get("reason") or "").strip()
    if not actor:
        return err(400, "actor is required")
    if len(reason) > MAX_REASON:
        return err(400, f"The reason must be at most {MAX_REASON} characters")
    now = now_iso()
    values = {":held": "ON_HOLD", ":approved": "APPROVED", ":actor": actor, ":now": now}
    expr = "SET #status = :held, heldBy = :actor, heldAt = :now, updatedAt = :now"
    if reason:
        expr += ", holdReason = :reason"
        values[":reason"] = reason
    else:
        expr += " REMOVE holdReason"
    try:
        updated = campaigns.update_item(
            Key={"campaignId": campaign_id},
            UpdateExpression=expr,
            # Still APPROVED means nothing was sent: the sender locks a campaign
            # (APPROVED -> SENDING) before its first email.
            ConditionExpression="#status = :approved",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )["Attributes"]
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            if not get_campaign(campaign_id):
                return err(404, "Campaign not found")
            return err(409, "Only a scheduled campaign that hasn't started sending can be put on hold.")
        raise
    return ok(updated)


def resume(campaign_id, body):
    """A held campaign back on the schedule (ON_HOLD -> APPROVED) with new dates."""
    actor = actor_of(body)
    if not actor:
        return err(400, "actor is required")
    existing = get_campaign(campaign_id)
    if not existing:
        return err(404, "Campaign not found")
    if existing.get("status") != "ON_HOLD":
        return err(409, "Only a campaign on hold can be resumed.")
    fields, problem = schedule_from(body, bool(existing.get("autoEndPostSending")), required=True)
    if problem:
        return err(400, problem)
    now = now_iso()
    names = {"#status": "status"}
    values = {":approved": "APPROVED", ":held": "ON_HOLD", ":actor": actor, ":now": now}
    expr = "SET #status = :approved, resumedBy = :actor, resumedAt = :now, updatedAt = :now" + set_clause(fields, names, values)
    if "endAt" not in fields:
        expr += " REMOVE endAt, endTime"
    try:
        updated = campaigns.update_item(
            Key={"campaignId": campaign_id},
            UpdateExpression=expr,
            ConditionExpression="#status = :held",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )["Attributes"]
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return err(409, "The campaign changed while you were resuming it. Refresh and try again.")
        raise
    return ok(updated)


def reinvoke(campaign_id, body):
    """A cancelled campaign back to DRAFT, to edit and submit again, with new
    dates when the body carries them."""
    actor = actor_of(body)
    if not actor:
        return err(400, "actor is required")
    fields, problem = schedule_from(body, True, required=False)
    if problem:
        return err(400, problem)
    remove = ["approvedBy", "approvedAt", "submittedBy", "submittedAt", "failureReason", "failedAt"]
    if "startAt" in fields and "endAt" not in fields:
        # A new start with no new end: an end that is not after the new start
        # belongs to the old schedule (an auto-ending campaign has none to
        # give), so it goes rather than leave the campaign ending before it
        # starts.
        old_end = parse_instant((get_campaign(campaign_id) or {}).get("endAt"))
        if old_end is not None and old_end <= parse_instant(fields["startAt"]):
            remove += ["endAt", "endTime"]
    now = now_iso()
    names = {"#status": "status"}
    values = {}
    extra = set_clause(fields, names, values)
    try:
        updated = campaigns.update_item(
            Key={"campaignId": campaign_id},
            UpdateExpression=(
                "SET #status = :draft, reinvokedBy = :actor, reinvokedAt = :now, updatedAt = :now"
                + extra
                + " REMOVE " + ", ".join(remove)
            ),
            # a cancelled campaign, or one that could not be sent, goes back
            # to its author to fix and submit again
            ConditionExpression="#status IN (:cancelled, :failed, :failed_old)",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues={
                ":draft": "DRAFT", ":cancelled": "CANCELLED", ":failed": "SEND_FAILED", ":failed_old": "FAILED",
                ":actor": actor, ":now": now, **values,
            },
            ReturnValues="ALL_NEW",
        )["Attributes"]
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            if not get_campaign(campaign_id):
                return err(404, "Campaign not found")
            return err(409, "Only a cancelled campaign, or one that could not be sent, can be reinvoked.")
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


def result_rows(campaign_id):
    """A campaign's recipients as result rows (see result_row), by email."""
    rows = query_all(recipients_table, KeyConditionExpression=Key("campaignId").eq(campaign_id))
    missing = {str(r.get("recipientEmail") or "").lower() for r in rows if not r.get("department")}
    people = people_by_email(missing - {""}) if missing else {}
    done = completed_trainings(rows)
    return sorted((result_row(r, people, done) for r in rows), key=lambda x: x["recipientEmail"])


def tally_rows(rows):
    """One campaign's counts, as the Home screen works them out
    (frontend services/homeDashboard.js tallyRows; the same cases are tested
    on both sides): each person once; `reached` is sent and not failed;
    `hooked` clicked without reporting; `trained` clicked and trained;
    reached and clicked per country."""
    t = {k: 0 for k in ("targeted", "reached", "opened", "clicked", "compromised", "reported", "hooked", "trained")}
    countries = {}
    seen = set()
    for r in rows:
        email = str(r.get("recipientEmail") or "").strip().lower()
        if email:
            if email in seen:
                continue
            seen.add(email)
        opened = bool(r.get("opened") or r.get("clicked") or r.get("reported"))
        reached = bool(r.get("sentAt") or r.get("deliveredAt") or r.get("sendStatus") == "SENT" or opened) \
            and r.get("sendStatus") != "FAILED"
        t["targeted"] += 1
        if not reached:
            continue
        clicked = bool(r.get("clicked"))
        t["reached"] += 1
        t["opened"] += opened
        t["clicked"] += clicked
        t["compromised"] += bool(r.get("compromised"))
        if r.get("reported"):
            t["reported"] += 1
        elif clicked:
            t["hooked"] += 1
        t["trained"] += clicked and bool(r.get("trained"))
        place = countries.setdefault(r.get("country") or "Unknown", {"reached": 0, "clicked": 0})
        place["reached"] += 1
        place["clicked"] += clicked
    return {**t, "countries": countries}


MAX_TALLIES = 50


def tallies(ids_text):
    """GET /campaigns/tallies?ids=A,B: {campaignId: counts} for each known
    campaign; the Home screen's one read instead of every recipient row of
    every campaign. Unknown ids are left out."""
    ids = [i for i in dict.fromkeys(str(ids_text or "").split(",")) if i.strip()]
    if not ids:
        return err(400, "ids is required (campaign ids, comma-separated)")
    if len(ids) > MAX_TALLIES:
        return err(400, f"At most {MAX_TALLIES} campaigns at a time")
    out = {}
    for campaign_id in ids:
        if get_campaign(campaign_id):
            out[campaign_id] = tally_rows(result_rows(campaign_id))
    return ok(out)


def results(campaign_id):
    campaign = get_campaign(campaign_id)
    if not campaign:
        return err(404, "Campaign not found")
    out = result_rows(campaign_id)
    count = lambda key: sum(1 for x in out if x[key])  # noqa: E731
    summary = {
        "recipients": len(out),
        "delivered": sum(1 for x in out if x.get("sendStatus") != "FAILED"),
        "opened": count("opened"), "clicked": count("clicked"), "compromised": count("compromised"),
        "reported": count("reported"), "trained": count("trained"),
    }
    return ok(out, summary=summary, campaignId=campaign_id, status=campaign.get("status"))


def lambda_handler(event, context):
    # the keep-warm schedule (infra/terraform/keep_warm.tf)
    if isinstance(event, dict) and event.get("warm") is True and "routeKey" not in event:
        return {"warm": True}
    route = event.get("routeKey", "")
    params = event.get("pathParameters") or {}
    qs = event.get("queryStringParameters") or {}

    try:
        if route == "GET /campaigns":
            # Every campaign (or every one in a status), following pages: a
            # single page stopped at 100 rows and hid the rest.
            status = qs.get("status")
            if status:
                # status-index keeps the hub and approvals queue off a full scan.
                items, truncated = read_all(
                    campaigns.query,
                    IndexName="status-index",
                    KeyConditionExpression=Key("status").eq(status),
                    ScanIndexForward=False,
                )
            else:
                items, truncated = read_all(campaigns.scan)
            items.sort(key=lambda c: str(c.get("createdAt", "")), reverse=True)
            if qs.get("view") == "summary":
                # lists that never show a campaign's email or landing page
                # (Home, the notices bell) skip their HTML: most of the bytes
                items = [{k: v for k, v in c.items() if k not in HEAVY_FIELDS} for c in items]
            return ok(items, count=len(items), truncated=truncated)

        if route == "GET /campaigns/tallies":
            return tallies(qs.get("ids"))

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

        if route == "POST /campaigns/{campaignId}/hold":
            return hold(params["campaignId"], parse_body(event))

        if route == "POST /campaigns/{campaignId}/resume":
            return resume(params["campaignId"], parse_body(event))

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
