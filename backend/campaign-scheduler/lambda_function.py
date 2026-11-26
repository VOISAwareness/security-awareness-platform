"""
campaign-scheduler: sends approved campaigns, and approved announcement
roll-outs, at their scheduled start (roll-outs: see schedule_announcements).

An EventBridge rule runs it every minute. Each run reads the APPROVED
campaigns (the campaigns table's status-index) and, for each whose start has
come, invokes email-sender asynchronously with its campaignId. email-sender
owns the send: its conditional APPROVED -> SENDING write means a campaign is
sent once even if two runs overlap, and a campaign withdrawn, rejected or
deleted before its start is simply no longer APPROVED, so it is never picked.

A campaign whose start passed more than MAX_LATENESS_MINUTES ago is not sent
but marked SEND_FAILED with the reason, so turning the scheduler on (or an
outage) never sends an old campaign at an unexpected time, and the campaign
doesn't sit APPROVED for ever looking scheduled: its author sees why and can
reinvoke it to a draft. One with no readable start time is marked the same
way. (A campaign that can't be sent at all, e.g. with no recipients, is
marked SEND_FAILED by email-sender.)

The start is startAt (a UTC instant, written by the wizard) or, for campaigns
saved before that, the local startTime read at DEFAULT_UTC_OFFSET_MINUTES.
"""
import json
import os
from datetime import UTC, datetime, timedelta, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

CAMPAIGNS_TABLE = os.environ["CAMPAIGNS_TABLE"]
EMAIL_SENDER_FUNCTION = os.environ["EMAIL_SENDER_FUNCTION"]
STATUS_INDEX = os.environ.get("STATUS_INDEX", "status-index")
DEFAULT_UTC_OFFSET_MINUTES = int(os.environ.get("DEFAULT_UTC_OFFSET_MINUTES", "330"))
MAX_LATENESS_MINUTES = int(os.environ.get("MAX_LATENESS_MINUTES", "60"))

# Announcement roll-outs, the same way (announcement-sender owns the send).
# The pass runs only when both are set; while sending is off it only logs, so
# roll-outs wait APPROVED rather than being marked missed.
ANNOUNCEMENTS_TABLE = os.environ.get("ANNOUNCEMENTS_TABLE", "")
ANNOUNCEMENT_SENDER_FUNCTION = os.environ.get("ANNOUNCEMENT_SENDER_FUNCTION", "")
ANNOUNCEMENT_SENDING_ENABLED = os.environ.get("ANNOUNCEMENT_SENDING_ENABLED", "false").strip().lower() == "true"

dynamodb = boto3.resource("dynamodb")
campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)
announcements_table = dynamodb.Table(ANNOUNCEMENTS_TABLE) if ANNOUNCEMENTS_TABLE else None
lambda_client = boto3.client("lambda")


def utc_now():
    return datetime.now(UTC)


def start_instant(campaign):
    """When the campaign starts, as an aware UTC datetime, or None."""
    raw = str(campaign.get("startAt") or "").strip()
    if raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            pass
    local = str(campaign.get("startTime") or "").strip()[:16]
    try:
        naive = datetime.strptime(local, "%Y-%m-%dT%H:%M")
    except ValueError:
        return None
    zone = timezone(timedelta(minutes=DEFAULT_UTC_OFFSET_MINUTES))
    return naive.replace(tzinfo=zone).astimezone(UTC)


def approved_campaigns():
    """Every APPROVED campaign, across pages of the status index."""
    kwargs = {"IndexName": STATUS_INDEX, "KeyConditionExpression": Key("status").eq("APPROVED")}
    while True:
        response = campaigns_table.query(**kwargs)
        yield from response.get("Items", [])
        last = response.get("LastEvaluatedKey")
        if not last:
            return
        kwargs["ExclusiveStartKey"] = last


def decide(campaign, now):
    """'send', 'wait', 'missed' or 'no-start' for one APPROVED campaign."""
    start = start_instant(campaign)
    if start is None:
        return "no-start"
    if start > now:
        return "wait"
    if now - start > timedelta(minutes=MAX_LATENESS_MINUTES):
        return "missed"
    return "send"


MISSED_REASON = (
    "Its start time passed more than {minutes} minutes ago and it was not sent. "
    "Reinvoke it, check its recipients and email, and choose new dates."
)
NO_START_REASON = "It has no readable start time. Reinvoke it and set its dates."


def mark_failed(campaign_id, reason, now):
    """APPROVED -> SEND_FAILED with the reason; False when it changed meanwhile."""
    stamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        campaigns_table.update_item(
            Key={"campaignId": campaign_id},
            UpdateExpression="SET #s = :failed, failureReason = :reason, failedAt = :now, updatedAt = :now",
            ConditionExpression="#s = :approved",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":failed": "SEND_FAILED", ":approved": "APPROVED", ":reason": reason, ":now": stamp},
        )
        return True
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
            raise
        return False


def log(context, message, **fields):
    print(json.dumps({"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}))


# ------------------------------------------------------------ announcements

def _last_sunday(year, month):
    nxt = datetime(year + (month == 12), month % 12 + 1, 1, tzinfo=UTC)
    last = nxt - timedelta(days=1)
    return last.day - (last.weekday() + 1) % 7


def uk_wall_clock(local):
    """A UK wall-clock time ("2026-10-12T09:00") as an aware UTC datetime, or None
    (BST from 01:00 UTC on the last Sunday of March to that of October)."""
    try:
        naive = datetime.strptime(str(local or "").strip()[:16], "%Y-%m-%dT%H:%M")
    except ValueError:
        return None
    as_utc = naive.replace(tzinfo=UTC)
    bst_from = datetime(naive.year, 3, _last_sunday(naive.year, 3), 1, tzinfo=UTC)
    bst_to = datetime(naive.year, 10, _last_sunday(naive.year, 10), 1, tzinfo=UTC)
    return as_utc - timedelta(hours=1) if bst_from <= as_utc - timedelta(hours=1) < bst_to else as_utc


def rollout_start(rollout):
    """A roll-out's start: the instant reference-api keeps (startAt), else its UK wall-clock time."""
    raw = str(rollout.get("startAt") or "").strip()
    if raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            pass
    return uk_wall_clock(rollout.get("announcementStartTime"))


def approved_rollouts():
    kwargs = {"IndexName": STATUS_INDEX, "KeyConditionExpression": Key("status").eq("APPROVED")}
    while True:
        response = announcements_table.query(**kwargs)
        yield from (r for r in response.get("Items", []) if r.get("kind") == "ROLLOUT")
        last = response.get("LastEvaluatedKey")
        if not last:
            return
        kwargs["ExclusiveStartKey"] = last


def fail_rollout(announcement_id, reason, now):
    stamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        announcements_table.update_item(
            Key={"announcementId": announcement_id},
            UpdateExpression="SET #s = :failed, failureReason = :reason, failedAt = :now, updatedAt = :now",
            ConditionExpression="#s = :approved",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":failed": "FAILED", ":approved": "APPROVED", ":reason": reason, ":now": stamp},
        )
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
            raise


ROLLOUT_MISSED = ("Its start time passed more than {minutes} minutes ago and it was not sent. "
                  "Roll it out again with new dates.")
ROLLOUT_NO_START = "It has no readable start time. Roll it out again with its dates."


def schedule_announcements(now, context):
    """Start the send of each APPROVED roll-out whose start has come; {sent, missed, waiting}."""
    out = {"sent": [], "missed": [], "waiting": 0, "due": []}
    if not (announcements_table and ANNOUNCEMENT_SENDER_FUNCTION):
        return out
    for rollout in approved_rollouts():
        rid = rollout.get("announcementId")
        start = rollout_start(rollout)
        outcome = ("no-start" if start is None else "wait" if start > now
                   else "missed" if now - start > timedelta(minutes=MAX_LATENESS_MINUTES) else "send")
        if outcome == "wait":
            out["waiting"] += 1
        elif not ANNOUNCEMENT_SENDING_ENABLED:
            out["due"].append(rid)  # sending is off: it waits, untouched
        elif outcome == "send":
            lambda_client.invoke(
                FunctionName=ANNOUNCEMENT_SENDER_FUNCTION,
                InvocationType="Event",
                Payload=json.dumps({"announcementId": rid, "source": "campaign-scheduler"}).encode(),
            )
            out["sent"].append(rid)
            log(context, "Scheduled announcement send started", announcementId=rid)
        elif outcome == "missed":
            out["missed"].append(rid)
            fail_rollout(rid, ROLLOUT_MISSED.format(minutes=MAX_LATENESS_MINUTES), now)
            log(context, "Announcement start missed; not sent, marked failed", announcementId=rid)
        else:
            fail_rollout(rid, ROLLOUT_NO_START, now)
            log(context, "Approved announcement has no readable start time; marked failed", announcementId=rid)
    if out["due"]:
        log(context, "Announcements due, but sending is off", due=len(out["due"]))
    return out


def lambda_handler(event, context):
    now = utc_now()
    sent, missed, waiting = [], [], 0
    for campaign in approved_campaigns():
        campaign_id = campaign.get("campaignId")
        outcome = decide(campaign, now)
        if outcome == "send":
            lambda_client.invoke(
                FunctionName=EMAIL_SENDER_FUNCTION,
                InvocationType="Event",
                Payload=json.dumps({"campaignId": campaign_id, "source": "campaign-scheduler"}).encode(),
            )
            sent.append(campaign_id)
            log(context, "Scheduled send started", campaignId=campaign_id)
        elif outcome == "missed":
            missed.append(campaign_id)
            mark_failed(campaign_id, MISSED_REASON.format(minutes=MAX_LATENESS_MINUTES), now)
            log(context, "Scheduled start missed; not sent, marked failed", campaignId=campaign_id,
                startAt=start_instant(campaign).isoformat())
        elif outcome == "wait":
            waiting += 1
        else:
            mark_failed(campaign_id, NO_START_REASON, now)
            log(context, "Approved campaign has no readable start time; marked failed", campaignId=campaign_id)
    result = {"sent": sent, "missed": missed, "waiting": waiting}
    extra = {}
    if announcements_table and ANNOUNCEMENT_SENDER_FUNCTION:
        result["announcements"] = schedule_announcements(now, context)
        extra = {"announcementsSent": len(result["announcements"]["sent"]),
                 "announcementsDue": len(result["announcements"]["due"])}
    log(context, "Scheduler run", sent=len(sent), missed=len(missed), waiting=waiting, **extra)
    return result
