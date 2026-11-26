"""
announcement-sender: emails an approved announcement roll-out to its people.

campaign-scheduler invokes it (asynchronously, {"announcementId": ...}) when
an APPROVED roll-out's start has come. It:

1. moves the roll-out APPROVED -> SENDING with a conditional write, so it is
   sent once however many times it is invoked;
2. works out who gets it: a test announcement goes only to its one chosen
   person (selectedSingleUserEmail) or to ANNOUNCEMENT_TEST_RECIPIENT, never
   to a list; otherwise the members of its recipient list (user-list-members
   by selectedListId), or its one chosen person;
3. for each person, stores a row in recipients (campaignId = the roll-out's
   id, a random token for its "I've read this" button, which opens
   GET /ack/{token} on the tracking Lambda), sends the email through SES, and
   marks the row SENT or FAILED with the SES error code;
4. ends the roll-out SENT (something went out) or FAILED (nothing did).

Safety:
- Nothing is sent unless ANNOUNCEMENT_SENDING_ENABLED is "true".
- When ANNOUNCEMENT_ALLOWED_DOMAINS is set (non-prod), any address outside
  those domains is never handed to SES; its row is FAILED "NotAllowedDomain".
- From is the roll-out's chosen sender only when SES has it verified, else
  ANNOUNCEMENT_SENDER_EMAIL; with neither the roll-out fails, unsent.
- In the SES sandbox only verified addresses receive anything; others fail
  one by one and are recorded, as for campaigns.
- Logs carry counts and token fingerprints, never addresses or tokens.

A cancel while sending (reference-api, SENDING -> CANCELLED) is seen between
batches and stops the send. A run that nears its time limit invokes itself
to carry on ({"resume": true}); people who already have a row are skipped, so
nobody gets it twice.
"""
import hashlib
import json
import os
import re
import secrets
import time
import uuid
from datetime import UTC, datetime
from email.utils import formataddr
from html import unescape

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError

ANNOUNCEMENTS_TABLE = os.environ["ANNOUNCEMENTS_TABLE"]
RECIPIENTS_TABLE = os.environ["RECIPIENTS_TABLE"]
USER_LIST_MEMBERS_TABLE = os.environ["USER_LIST_MEMBERS_TABLE"]
SES_REGION = os.environ.get("SES_REGION") or os.environ.get("AWS_REGION") or "ap-south-1"
SENDING_ENABLED = os.environ.get("ANNOUNCEMENT_SENDING_ENABLED", "false").strip().lower() == "true"
FALLBACK_SENDER = os.environ.get("ANNOUNCEMENT_SENDER_EMAIL", "").strip()
TEST_RECIPIENT = os.environ.get("ANNOUNCEMENT_TEST_RECIPIENT", "").strip()
ALLOWED_DOMAINS = frozenset(
    d.strip().lower().lstrip("@") for d in os.environ.get("ANNOUNCEMENT_ALLOWED_DOMAINS", "").split(",") if d.strip()
)
# SES's sending rate: 1 a second in the sandbox; raise it with production access.
MAX_PER_SECOND = max(1.0, float(os.environ.get("ANNOUNCEMENT_MAX_PER_SECOND", "1")))
# The API's public address: each email's "I've read this" button opens
# {API_BASE_URL}/ack/{token} (the tracking Lambda). Blank: no button.
API_BASE_URL = os.environ.get("API_BASE_URL", "").strip().rstrip("/")
CHECK_EVERY = 25  # people between looks at the roll-out (a cancel stops the send)
RESUME_MARGIN_MS = 30_000  # carry on in a new run when less than this is left
MAX_REASON = 300

dynamodb = boto3.resource("dynamodb")
announcements_table = dynamodb.Table(ANNOUNCEMENTS_TABLE)
recipients_table = dynamodb.Table(RECIPIENTS_TABLE)
members_table = dynamodb.Table(USER_LIST_MEMBERS_TABLE)
ses_client = boto3.client("ses", region_name=SES_REGION)
lambda_client = boto3.client("lambda")

DEFAULT_NAME = "Colleague"
USER_NAME = "{{USER_NAME}}"


def now_iso():
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(context, message, **fields):
    print(json.dumps({"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}))


def fingerprint(token):
    return hashlib.sha256(token.encode()).hexdigest()[:12]


# ---------------------------------------------------------------- the roll-out

def load(announcement_id):
    return announcements_table.get_item(Key={"announcementId": announcement_id}).get("Item")


def move(announcement_id, from_status, to_status, **fields):
    """from_status -> to_status (with fields), only while it is from_status; False when it changed."""
    names = {"#s": "status"}
    values = {":from": from_status, ":to": to_status, ":now": now_iso()}
    sets = ["#s = :to", "updatedAt = :now"]
    for i, (key, value) in enumerate(fields.items()):
        names[f"#f{i}"] = key
        values[f":v{i}"] = value
        sets.append(f"#f{i} = :v{i}")
    try:
        announcements_table.update_item(
            Key={"announcementId": announcement_id},
            UpdateExpression="SET " + ", ".join(sets),
            ConditionExpression="#s = :from",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
        return True
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
            raise
        return False


def truthy(value):
    return value is True or (isinstance(value, str) and value.strip().lower() == "true")


# ------------------------------------------------------------------ who gets it

def list_members(list_id):
    out, kwargs = [], {"KeyConditionExpression": Key("userListId").eq(list_id)}
    while True:
        page = members_table.query(**kwargs)
        for item in page.get("Items", []):
            if item.get("email"):
                out.append({"email": item["email"], "name": item.get("userName") or DEFAULT_NAME})
        if "LastEvaluatedKey" not in page:
            return out
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def recipients_of(rollout):
    """[{email, name}], repeats dropped. A test announcement never goes to a list."""
    single = str(rollout.get("selectedSingleUserEmail") or "").strip()
    if truthy(rollout.get("isAnnouncementTestCampaign")):
        people = [{"email": single or TEST_RECIPIENT, "name": DEFAULT_NAME}] if (single or TEST_RECIPIENT) else []
    elif rollout.get("selectedListId"):
        people = list_members(str(rollout["selectedListId"]))
    elif single:
        people = [{"email": single, "name": DEFAULT_NAME}]
    else:
        people = []
    seen, out = set(), []
    for p in people:
        email = str(p["email"]).strip()
        if "@" in email and email.lower() not in seen:
            seen.add(email.lower())
            out.append({"email": email, "name": p["name"]})
    return out


def allowed(email):
    return not ALLOWED_DOMAINS or email.rsplit("@", 1)[-1].lower() in ALLOWED_DOMAINS


def already_have(announcement_id):
    """Addresses that already have a row for this roll-out (a resumed run skips them)."""
    out, kwargs = set(), {"KeyConditionExpression": Key("campaignId").eq(announcement_id),
                          "ProjectionExpression": "recipientEmail"}
    while True:
        page = recipients_table.query(**kwargs)
        out.update(str(i.get("recipientEmail", "")).lower() for i in page.get("Items", []))
        if "LastEvaluatedKey" not in page:
            return out
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


# ------------------------------------------------------------------ the email

def ses_verified(address):
    try:
        attrs = ses_client.get_identity_verification_attributes(Identities=[address])
    except (BotoCoreError, ClientError):
        return False
    return attrs.get("VerificationAttributes", {}).get(address, {}).get("VerificationStatus") == "Success"


def sender_of(rollout):
    """The From address, or None when there is no usable one."""
    chosen = str(rollout.get("announcementSenderEmailId") or "").strip()
    if chosen and ses_verified(chosen):
        name = str(rollout.get("announcementSenderName") or "").strip()
        return formataddr((name, chosen)) if name else chosen
    return FALLBACK_SENDER or None


def render(text, name):
    return str(text or "").replace(USER_NAME, name)


ACK_BUTTON = (
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr>'
    '<td style="border-radius:8px;background:#e60000">'
    '<a href="{url}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;'
    'font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">'
    "I&#8217;ve read this</a></td></tr></table>"
)


def ack_url(token):
    return f"{API_BASE_URL}/ack/{token}" if API_BASE_URL.startswith("https://") else ""


def with_ack_button(html, url):
    """The body with its "I've read this" button at the end (inside </body> when there is one)."""
    if not url:
        return html
    button = ACK_BUTTON.format(url=url)
    at = html.lower().rfind("</body>")
    return html[:at] + button + html[at:] if at >= 0 else html + button


def plain_text(html):
    """A readable text part from the HTML body."""
    text = re.sub(r"(?is)<(script|style).*?</\1>", "", html)
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>|</h\d>", "\n", text)
    text = unescape(re.sub(r"<[^>]+>", "", text))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def send_one(rollout, person, source):
    """Store the person's row, send, mark it; returns 'sent' or 'failed'."""
    announcement_id = rollout["announcementId"]
    recipient_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(32)
    stamp = now_iso()
    row = {
        "campaignId": announcement_id,
        "recipientId": recipient_id,
        "kind": "ANNOUNCEMENT",
        "recipientEmail": person["email"],
        "recipientName": person["name"],
        "trackingToken": token,
        "tokenFingerprint": fingerprint(token),
        "sendStatus": "PENDING",
        "createdAt": stamp,
        "updatedAt": stamp,
    }
    if rollout.get("expiresAt") is not None:
        row["expiresAt"] = rollout["expiresAt"]  # the roll-out's retention
    recipients_table.put_item(Item=row, ConditionExpression="attribute_not_exists(recipientId)")

    def fail(reason):
        recipients_table.update_item(
            Key={"campaignId": announcement_id, "recipientId": recipient_id},
            UpdateExpression="SET sendStatus = :f, failureReason = :r, failedAt = :t, updatedAt = :t",
            ExpressionAttributeValues={":f": "FAILED", ":r": reason[:MAX_REASON], ":t": now_iso()},
        )
        return "failed"

    if not allowed(person["email"]):
        return fail("NotAllowedDomain")
    url = ack_url(token)
    body = render(rollout.get("announcementEmailBody"), person["name"])
    html = with_ack_button(body, url)
    text = plain_text(body) + (f"\n\nI've read this: {url}" if url else "")
    subject = render(rollout.get("announcementEmailSubject") or rollout.get("announcementCampaignTitle"), person["name"])
    try:
        response = ses_client.send_email(
            Source=source,
            Destination={"ToAddresses": [person["email"]]},
            Message={
                "Subject": {"Data": subject[:998], "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html, "Charset": "UTF-8"},
                         "Text": {"Data": text, "Charset": "UTF-8"}},
            },
        )
    except ClientError as error:
        return fail(error.response.get("Error", {}).get("Code", "AWSClientError"))
    except BotoCoreError as error:
        return fail(type(error).__name__)
    sent_at = now_iso()
    recipients_table.update_item(
        Key={"campaignId": announcement_id, "recipientId": recipient_id},
        UpdateExpression="SET sendStatus = :s, sentAt = :t, sesMessageId = :m, updatedAt = :t",
        ExpressionAttributeValues={":s": "SENT", ":t": sent_at, ":m": response["MessageId"]},
    )
    return "sent"


# ------------------------------------------------------------------ the handler

def time_left_ms(context):
    getter = getattr(context, "get_remaining_time_in_millis", None)
    return getter() if callable(getter) else 10**9


def finish(announcement_id, context, totals):
    """SENDING -> SENT (something went out) or FAILED (nothing did); a cancel meanwhile stays."""
    done = now_iso()
    if totals["sent"]:
        moved = move(announcement_id, "SENDING", "SENT", sentAt=done, sentCount=totals["sent"], failedCount=totals["failed"])
    else:
        moved = move(announcement_id, "SENDING", "FAILED", failedAt=done, sentCount=0, failedCount=totals["failed"],
                     failureReason="No one could be sent the announcement; see its recipients for why.")
    log(context, "Announcement send finished", announcementId=announcement_id, moved=moved, **totals)
    return {"announcementId": announcement_id, **totals}


def lambda_handler(event, context):
    announcement_id = str((event or {}).get("announcementId") or "").strip()
    if not announcement_id:
        return {"error": "announcementId is required"}
    if not SENDING_ENABLED:
        log(context, "Announcement sending is off; not sent", announcementId=announcement_id)
        return {"announcementId": announcement_id, "skipped": "sending is off"}

    rollout = load(announcement_id)
    if not rollout or rollout.get("kind") != "ROLLOUT":
        return {"error": "No roll-out with that id"}
    resume = bool((event or {}).get("resume"))
    if not resume:
        source = sender_of(rollout)
        people = recipients_of(rollout)
        why = None if source else "No sender: its sender is not verified in SES and no fallback is set."
        why = why or (None if people else "It has no recipients.")
        if why:
            move(announcement_id, "APPROVED", "FAILED", failureReason=why, failedAt=now_iso())
            log(context, "Announcement cannot be sent", announcementId=announcement_id, reason=why)
            return {"announcementId": announcement_id, "failed": why}
        if not move(announcement_id, "APPROVED", "SENDING", sendStartedAt=now_iso(), recipientCount=len(people)):
            log(context, "Announcement is no longer approved; not sent", announcementId=announcement_id)
            return {"announcementId": announcement_id, "skipped": "not approved"}
    else:
        if rollout.get("status") != "SENDING":
            return {"announcementId": announcement_id, "skipped": "not sending"}
        source, people = sender_of(rollout), recipients_of(rollout)
        if not source:
            source = FALLBACK_SENDER

    done = already_have(announcement_id) if resume else set()
    totals = {"sent": int(rollout.get("sentSoFar") or 0) if resume else 0,
              "failed": int(rollout.get("failedSoFar") or 0) if resume else 0}
    gap = 1.0 / MAX_PER_SECOND
    for i, person in enumerate(p for p in people if p["email"].lower() not in done):
        if i and i % CHECK_EVERY == 0 and (load(announcement_id) or {}).get("status") != "SENDING":
            log(context, "Announcement send stopped (cancelled)", announcementId=announcement_id, **totals)
            return {"announcementId": announcement_id, "stopped": True, **totals}
        if time_left_ms(context) < RESUME_MARGIN_MS:
            announcements_table.update_item(
                Key={"announcementId": announcement_id},
                UpdateExpression="SET sentSoFar = :s, failedSoFar = :f",
                ExpressionAttributeValues={":s": totals["sent"], ":f": totals["failed"]},
            )
            lambda_client.invoke(FunctionName=context.function_name, InvocationType="Event",
                                 Payload=json.dumps({"announcementId": announcement_id, "resume": True}).encode())
            log(context, "Announcement send continues in a new run", announcementId=announcement_id, **totals)
            return {"announcementId": announcement_id, "continued": True, **totals}
        started = time.monotonic()
        totals[send_one(rollout, person, source)] += 1
        wait = gap - (time.monotonic() - started)
        if wait > 0:
            time.sleep(wait)
    return finish(announcement_id, context, totals)
