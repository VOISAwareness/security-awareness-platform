"""
announcement-feedback: what happened to each announcement email after SES
accepted it.

announcement-sender sends through the SES configuration set
ANNOUNCEMENT_CONFIGURATION_SET, tagging each email with its roll-out
(announcementId) and person (recipientId). SES publishes that set's Delivery,
Bounce and Complaint events to an SNS topic, which invokes this Lambda
(announcement_feedback.tf). For each event it updates that person's row in
recipients:

- Delivery:  deliveredAt
- Bounce:    bouncedAt, bounceType (Permanent | Transient | Undetermined),
             bounceSubType (e.g. General, NoEmail, Suppressed)
- Complaint: complainedAt (they marked it as spam)

Only rows announcement-sender wrote (kind ANNOUNCEMENT) are changed, and each
time is kept from its first event. Nothing else from the event is stored:
not the addresses, the diagnostic text or the message. Logs carry ids and
counts only.
"""
import json
import os
from datetime import UTC, datetime

import boto3
from botocore.exceptions import ClientError

RECIPIENTS_TABLE = os.environ["RECIPIENTS_TABLE"]

dynamodb = boto3.resource("dynamodb")
recipients_table = dynamodb.Table(RECIPIENTS_TABLE)

BOUNCE_TYPES = {"Permanent", "Transient", "Undetermined"}
MAX_SUBTYPE = 40


def log(context, message, **fields):
    print(json.dumps({"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}))


def tag(mail, name):
    """One value of a message tag SES carried through ({name: [value]})."""
    values = (mail.get("tags") or {}).get(name) or []
    return str(values[0]) if values else ""


def when(value):
    """The event's own time (ISO), else now."""
    text = str(value or "").strip()
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
        return text
    except ValueError:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def change_for(event):
    """(announcementId, recipientId, SET clause, values) for one SES event, or None to skip it."""
    kind = event.get("eventType") or event.get("notificationType")
    mail = event.get("mail") or {}
    announcement_id, recipient_id = tag(mail, "announcementId"), tag(mail, "recipientId")
    if not (announcement_id and recipient_id):
        return None
    if kind == "Delivery":
        at = when((event.get("delivery") or {}).get("timestamp"))
        return announcement_id, recipient_id, "deliveredAt = if_not_exists(deliveredAt, :at)", {":at": at}
    if kind == "Bounce":
        bounce = event.get("bounce") or {}
        bounce_type = bounce.get("bounceType") if bounce.get("bounceType") in BOUNCE_TYPES else "Undetermined"
        values = {":at": when(bounce.get("timestamp")), ":type": bounce_type,
                  ":sub": str(bounce.get("bounceSubType") or "")[:MAX_SUBTYPE] or "Undetermined"}
        return (announcement_id, recipient_id,
                "bouncedAt = if_not_exists(bouncedAt, :at), bounceType = :type, bounceSubType = :sub", values)
    if kind == "Complaint":
        at = when((event.get("complaint") or {}).get("timestamp"))
        return announcement_id, recipient_id, "complainedAt = if_not_exists(complainedAt, :at)", {":at": at}
    return None


def lambda_handler(event, context):
    applied = skipped = 0
    for record in (event or {}).get("Records", []):
        try:
            message = json.loads(((record.get("Sns") or {}).get("Message")) or "{}")
        except ValueError:
            skipped += 1
            continue
        change = change_for(message)
        if not change:
            skipped += 1
            continue
        announcement_id, recipient_id, sets, values = change
        try:
            recipients_table.update_item(
                Key={"campaignId": announcement_id, "recipientId": recipient_id},
                UpdateExpression=f"SET {sets}, updatedAt = :now",
                ConditionExpression="attribute_exists(recipientId) AND kind = :ann",
                ExpressionAttributeValues={**values, ":now": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
                                           ":ann": "ANNOUNCEMENT"},
            )
            applied += 1
            log(context, "Announcement email feedback", announcementId=announcement_id, recipientId=recipient_id,
                eventType=message.get("eventType") or message.get("notificationType"))
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
                raise  # SNS retries the delivery
            skipped += 1  # not an announcement row (or gone)
    log(context, "Feedback batch done", applied=applied, skipped=skipped)
    return {"applied": applied, "skipped": skipped}
