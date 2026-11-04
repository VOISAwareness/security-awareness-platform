"""
campaign-scheduler: sends approved campaigns at their scheduled start.

An EventBridge rule runs it every minute. Each run reads the APPROVED
campaigns (the campaigns table's status-index) and, for each whose start has
come, invokes email-sender asynchronously with its campaignId. email-sender
owns the send: its conditional APPROVED -> SENDING write means a campaign is
sent once even if two runs overlap, and a campaign withdrawn, rejected or
deleted before its start is simply no longer APPROVED, so it is never picked.

A campaign whose start passed more than MAX_LATENESS_MINUTES ago is not sent
but logged as missed, so turning the scheduler on (or an outage) never sends
an old campaign at an unexpected time.

The start is startAt (a UTC instant, written by the wizard) or, for campaigns
saved before that, the local startTime read at DEFAULT_UTC_OFFSET_MINUTES.
"""
import json
import os
from datetime import UTC, datetime, timedelta, timezone

import boto3
from boto3.dynamodb.conditions import Key

CAMPAIGNS_TABLE = os.environ["CAMPAIGNS_TABLE"]
EMAIL_SENDER_FUNCTION = os.environ["EMAIL_SENDER_FUNCTION"]
STATUS_INDEX = os.environ.get("STATUS_INDEX", "status-index")
DEFAULT_UTC_OFFSET_MINUTES = int(os.environ.get("DEFAULT_UTC_OFFSET_MINUTES", "330"))
MAX_LATENESS_MINUTES = int(os.environ.get("MAX_LATENESS_MINUTES", "60"))

dynamodb = boto3.resource("dynamodb")
campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)
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


def log(context, message, **fields):
    print(json.dumps({"message": message, "requestId": getattr(context, "aws_request_id", None), **fields}))


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
            log(context, "Scheduled start missed; not sent", campaignId=campaign_id,
                startAt=start_instant(campaign).isoformat())
        elif outcome == "wait":
            waiting += 1
        else:
            log(context, "Approved campaign has no readable start time", campaignId=campaign_id)
    log(context, "Scheduler run", sent=len(sent), missed=len(missed), waiting=waiting)
    return {"sent": sent, "missed": missed, "waiting": waiting}
