import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError


RECIPIENTS_TABLE = os.environ["RECIPIENTS_TABLE"]
EVENTS_TABLE = os.environ["EVENTS_TABLE"]
TRACKING_TOKEN_INDEX = os.environ["TRACKING_TOKEN_INDEX"]

dynamodb = boto3.resource("dynamodb")

recipients_table = dynamodb.Table(RECIPIENTS_TABLE)
events_table = dynamodb.Table(EVENTS_TABLE)


def utc_timestamp():
    return datetime.now(timezone.utc).isoformat()


def build_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        },
        "body": json.dumps(body)
    }


def get_tracking_token(event):
    path_parameters = event.get("pathParameters") or {}

    return (
        path_parameters.get("trackingToken")
        or event.get("trackingToken")
    )


def lambda_handler(event, context):
    tracking_token = get_tracking_token(event)

    if not tracking_token:
        return build_response(
            400,
            {
                "message": "trackingToken is required"
            }
        )

    try:
        recipient_response = recipients_table.query(
            IndexName=TRACKING_TOKEN_INDEX,
            KeyConditionExpression=(
                Key("trackingToken").eq(tracking_token)
            ),
            Limit=1
        )

        recipients = recipient_response.get("Items", [])

        if not recipients:
            return build_response(
                404,
                {
                    "message": "Invalid or unavailable tracking token"
                }
            )

        recipient = recipients[0]

        campaign_id = recipient["campaignId"]
        recipient_id = recipient["recipientId"]

        event_id = f"EVT-{uuid.uuid4().hex}"
        event_timestamp = utc_timestamp()

        events_table.put_item(
            Item={
                "campaignId": campaign_id,
                "eventId": event_id,
                "recipientId": recipient_id,
                "eventType": "REPORT",
                "eventTimestamp": event_timestamp,
                "eventSource": "POC_REPORT_ENDPOINT",
                "trackingToken": tracking_token
            }
        )

        recipients_table.update_item(
            Key={
                "campaignId": campaign_id,
                "recipientId": recipient_id
            },
            UpdateExpression=(
                "SET reportedAt = "
                "if_not_exists(reportedAt, :reportedAt), "
                "lastReportedAt = :reportedAt, "
                "updatedAt = :reportedAt "
                "ADD reportCount :increment"
            ),
            ExpressionAttributeValues={
                ":reportedAt": event_timestamp,
                ":increment": 1
            }
        )

        print(
            json.dumps(
                {
                    "message": "Report event recorded",
                    "campaignId": campaign_id,
                    "recipientId": recipient_id,
                    "eventId": event_id,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            200,
            {
                "message": "Report event recorded successfully",
                "campaignId": campaign_id,
                "recipientId": recipient_id,
                "eventId": event_id,
                "eventType": "REPORT",
                "eventTimestamp": event_timestamp
            }
        )

    except ClientError as error:
        error_code = error.response.get(
            "Error", {}
        ).get("Code", "AWSClientError")

        print(
            json.dumps(
                {
                    "message": "Report operation failed",
                    "errorCode": error_code,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            500,
            {
                "message": "Unable to record report event",
                "requestId": context.aws_request_id
            }
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "message": "Unexpected report error",
                    "errorType": type(error).__name__,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            500,
            {
                "message": "An unexpected error occurred",
                "requestId": context.aws_request_id
            }
        )