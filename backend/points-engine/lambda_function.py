"""
points-engine: turns tracked campaign events into points.

Triggered by the events table's stream (new rows only). For each event it
finds the person (the recipient row's email), looks up what that action is
worth in the gamification rules, and writes two things to the points ledger
in one transaction:

  owner = <email>, entryId = "E#<campaignId>#<rule>"   the entry
  owner = <email>, entryId = "TOTAL"                   the running total

The entry is written only if it isn't there yet, so each action counts once
per campaign: clicking the same simulated link five times loses the points
once, and a retried batch never counts twice. Test campaigns score nothing,
and neither do actions worth 0 points.

The person's level is not stored: it is worked out from the total whenever
it is read (reference-api GET /standing), so a change to the level table
needs no data migration.

Throttling and other passing errors fail only that record (the stream retries
it); anything that can never succeed (no recipient row, an unknown action) is
logged and skipped. Logs never carry emails or tokens.
"""
import hashlib
import json
import os
import time
from datetime import UTC, datetime
from decimal import Decimal

import boto3
from boto3.dynamodb.types import TypeDeserializer
from botocore.config import Config
from botocore.exceptions import ClientError

TABLE_PREFIX = os.environ["TABLE_PREFIX"]

# Fail fast when the small provisioned ledger is busy: the stream retries the
# record, which beats retrying inside the Lambda until it times out.
dynamodb = boto3.resource("dynamodb", config=Config(retries={"mode": "standard", "max_attempts": 3}))
client = dynamodb.meta.client

LEDGER = f"{TABLE_PREFIX}-points-ledger"
TOTAL = "TOTAL"
BOARD = "GLOBAL"  # every total is on the one global board (sparse index later)

# events.eventType -> gamification rule (EventOperation). Tracking writes CLICK,
# the report button REPORT; the rest are written as those features land.
EVENT_RULES = {
    "OPEN": "Opened",
    "CLICK": "Clicked",
    "SUBMIT": "Compromised",
    "COMPROMISE": "Compromised",
    "CREDENTIAL_SUBMIT": "Compromised",
    "REPORT": "Reported",
    "TRAINED": "Trained",
    "EVALUATED": "Evaluated",
}

RULES_TTL_SECONDS = 300
_rules = {"at": 0.0, "points": {}}
_deserializer = TypeDeserializer()


def log(context, message, **fields):
    print(json.dumps({"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}, default=str))


def fingerprint(email):
    """A short stable tag for a person in logs, instead of their email."""
    return hashlib.sha256(email.encode()).hexdigest()[:12]


def now_iso():
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def is_test_campaign(campaign):
    """The wizard's "test campaign" tick (a real boolean, or "true" as text)."""
    value = (campaign or {}).get("isTestCampaign")
    if isinstance(value, str):
        return value.strip().lower() == "true"
    return value is True


def campaign_name(campaign):
    return str((campaign or {}).get("campaignTitle") or (campaign or {}).get("campaignName") or "")[:200]


def rule_points(force=False):
    """EventOperation -> points, from the gamification rules (cached briefly,
    so an edit in the Gamification Engine applies within minutes)."""
    if force or not _rules["points"] or time.monotonic() - _rules["at"] > RULES_TTL_SECONDS:
        rows, kwargs = [], {}
        tbl = dynamodb.Table(f"{TABLE_PREFIX}-gamification-rules")
        while True:
            resp = tbl.scan(**kwargs)
            rows.extend(resp.get("Items", []))
            if not resp.get("LastEvaluatedKey"):
                break
            kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
        points = {}
        for row in rows:
            try:
                points[str(row.get("EventOperation"))] = int(Decimal(str(row.get("PointsAssigned"))))
            except (ArithmeticError, ValueError):  # a junk rule is just not scored
                continue
        _rules.update(at=time.monotonic(), points=points)
    return _rules["points"]


def new_image(record):
    image = (record.get("dynamodb") or {}).get("NewImage") or {}
    return {k: _deserializer.deserialize(v) for k, v in image.items()}


def ledger_writes(email, rule, delta, image, campaign, at):
    """The transaction: the entry (only if new) and the total it adds to."""
    entry = {
        "owner": email,
        "entryId": f"E#{image['campaignId']}#{rule}",
        "rule": rule,
        "delta": delta,
        "campaignId": image["campaignId"],
        "campaignName": campaign_name(campaign),
        "recipientId": image.get("recipientId", ""),
        "sourceEventId": image.get("eventId", ""),
        "at": image.get("eventTimestamp") or at,
        "createdAt": at,
    }
    return [
        {
            "Put": {
                "TableName": LEDGER,
                "Item": entry,
                "ConditionExpression": "attribute_not_exists(entryId)",
            }
        },
        {
            "Update": {
                "TableName": LEDGER,
                "Key": {"owner": email, "entryId": TOTAL},
                "UpdateExpression": "ADD points :d, entries :one SET updatedAt = :at, board = :board",
                "ExpressionAttributeValues": {":d": delta, ":one": 1, ":at": at, ":board": BOARD},
            }
        },
    ]


class Skip(Exception):
    """This record can never score; log it and move on."""


def score(image, context, campaigns):
    """Score one event. Returns the points written, or raises Skip."""
    rule = EVENT_RULES.get(str(image.get("eventType", "")).upper())
    if not rule:
        raise Skip("not a scored action")
    campaign_id, recipient_id = image.get("campaignId"), image.get("recipientId")
    if not campaign_id or not recipient_id:
        raise Skip("event without campaign or recipient")

    if campaign_id not in campaigns:
        campaigns[campaign_id] = (
            dynamodb.Table(f"{TABLE_PREFIX}-campaigns").get_item(Key={"campaignId": campaign_id}).get("Item")
        )
    campaign = campaigns[campaign_id]
    if is_test_campaign(campaign):
        raise Skip("test campaign")

    recipient = (
        dynamodb.Table(f"{TABLE_PREFIX}-recipients")
        .get_item(Key={"campaignId": campaign_id, "recipientId": recipient_id})
        .get("Item")
    )
    email = str((recipient or {}).get("recipientEmail") or (recipient or {}).get("email") or "").strip().lower()
    if not email:
        raise Skip("no recipient email")

    delta = rule_points().get(rule)
    if delta is None:
        delta = rule_points(force=True).get(rule)
    if not delta:
        raise Skip("action worth 0 points")

    try:
        client.transact_write_items(TransactItems=ledger_writes(email, rule, delta, image, campaign, now_iso()))
    except ClientError as e:
        reasons = e.response.get("CancellationReasons") or []
        if e.response.get("Error", {}).get("Code") == "TransactionCanceledException" and reasons and (
            reasons[0].get("Code") == "ConditionalCheckFailed"
        ):
            raise Skip("already counted for this campaign") from None
        raise
    log(context, "Points recorded", person=fingerprint(email), campaignId=campaign_id, rule=rule, delta=delta)
    return delta


def lambda_handler(event, context):
    failures = []
    campaigns = {}
    scored = skipped = 0
    for record in event.get("Records", []):
        if record.get("eventName") != "INSERT":
            continue
        image = new_image(record)
        try:
            score(image, context, campaigns)
            scored += 1
        except Skip as why:
            skipped += 1
            log(context, "Event not scored", reason=str(why), campaignId=image.get("campaignId"), eventId=image.get("eventId"))
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "AWSClientError")
            log(context, "Event scoring failed; will retry", code=code, campaignId=image.get("campaignId"), eventId=image.get("eventId"))
            failures.append({"itemIdentifier": record.get("dynamodb", {}).get("SequenceNumber")})
    log(context, "Batch done", scored=scored, skipped=skipped, failed=len(failures))
    return {"batchItemFailures": failures}
