import json
import os
import uuid
from datetime import UTC, datetime

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
    """Return the current UTC timestamp in ISO-8601 format."""
    return datetime.now(UTC).isoformat()


def json_response(status_code, body):
    """Return a JSON API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        },
        "body": json.dumps(body)
    }


def html_response(status_code, html):
    """Return an HTML API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": (
                "default-src 'none'; "
                "style-src 'unsafe-inline'"
            )
        },
        "body": html,
        "isBase64Encoded": False
    }


def get_tracking_token(event):
    """
    Read the tracking token from API Gateway path parameters
    or from a direct Lambda test event.
    """
    path_parameters = event.get("pathParameters") or {}

    return (
        path_parameters.get("trackingToken")
        or event.get("trackingToken")
    )


def build_invalid_link_page():
    """Build the invalid-token HTML page."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>Invalid Security Awareness Link</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 24px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f4f4f4;
            color: #333333;
            font-family: Arial, Helvetica, sans-serif;
        }

        .container {
            width: 100%;
            max-width: 600px;
            padding: 32px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        h1 {
            margin: 0 0 16px;
            color: #e60000;
            font-size: 28px;
            line-height: 36px;
        }

        p {
            margin: 0;
            color: #555555;
            font-size: 15px;
            line-height: 24px;
        }
    </style>
</head>

<body>
    <main class="container">
        <h1>Invalid Link</h1>

        <p>
            This security-awareness link is invalid or unavailable.
        </p>
    </main>
</body>
</html>
"""


def build_success_page(campaign_id):
    """
    Build the successful click-tracking page.

    This is deliberately a normal string rather than an f-string.
    A placeholder is replaced afterward so CSS braces remain unchanged.
    """
    html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Security Awareness Training</title>

    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background-color: #0d5db8;
            background-image: linear-gradient(
                180deg,
                #0f64c6 0%,
                #0a4f9e 100%
            );
            color: #ffffff;
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
            text-align: center;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .main-heading {
            margin-bottom: 24px;
            color: #ffffff;
            font-size: 56px;
            font-weight: 700;
            line-height: 1.15;
            letter-spacing: -0.5px;
        }

        .sub-heading {
            margin-bottom: 8px;
            color: #ffffff;
            font-size: 32px;
            font-weight: 600;
            line-height: 1.3;
        }

        .simulation-tag {
            margin-bottom: 22px;
            color: #e3effd;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .description-text {
            max-width: 820px;
            margin: 0 auto 14px;
            color: #e1edfc;
            font-size: 15px;
            line-height: 1.6;
        }

        .instructions-text {
            margin-bottom: 32px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.5;
        }

        .training-button {
            display: inline-block;
            padding: 13px 34px;
            background-color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 6px;
            color: #0d5db8;
            font-family: inherit;
            font-size: 16px;
            font-weight: 600;
            line-height: 22px;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        .training-button:hover {
            background-color: #f0f6ff;
            color: #09478f;
        }

        .campaign-meta {
            margin-top: 48px;
            color: rgba(255, 255, 255, 0.7);
            font-family: Consolas, Monaco, monospace;
            font-size: 12px;
            line-height: 18px;
        }

        .privacy-note {
            max-width: 700px;
            margin: 24px auto 0;
            color: #dbeafd;
            font-size: 12px;
            line-height: 19px;
        }

        @media only screen and (max-width: 768px) {
            body {
                padding: 18px;
            }

            .container {
                padding: 28px 10px;
            }

            .main-heading {
                font-size: 38px;
            }

            .sub-heading {
                font-size: 24px;
            }

            .description-text,
            .instructions-text {
                font-size: 14px;
            }

            .training-button {
                width: 100%;
                max-width: 320px;
                padding: 14px 20px;
            }
        }
    </style>
</head>

<body>
    <main class="container">
        <h1 class="main-heading">
            Security Awareness<br>
            Simulation
        </h1>

        <h2 class="sub-heading">
            This was a controlled test
        </h2>

        <p class="simulation-tag">
            Security awareness simulation
        </p>

        <p class="description-text">
            This interaction was part of an authorized security-awareness
            proof of concept. The purpose is to help users recognize
            suspicious email characteristics and use approved reporting
            procedures.
        </p>

        <p class="instructions-text">
            Review the available security-awareness guidance to learn how
            to identify and report suspicious messages.
        </p>

        <div>
            <span class="training-button">
                Training content will be connected in a later phase
            </span>
        </div>

        <p class="privacy-note">
            This page does not request or collect passwords,
            authentication codes, payment details, or other authentication
            secrets.
        </p>

        <p class="campaign-meta">
            Campaign reference: __CAMPAIGN_ID__
        </p>
    </main>
</body>
</html>
"""

    return html.replace(
        "__CAMPAIGN_ID__",
        campaign_id
    )


def lambda_handler(event, context):
    """Record a recipient click event and return the awareness page."""
    tracking_token = get_tracking_token(event)

    if not tracking_token:
        return json_response(
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

        recipients = recipient_response.get(
            "Items",
            []
        )

        if not recipients:
            return html_response(
                404,
                build_invalid_link_page()
            )

        recipient = recipients[0]

        campaign_id = recipient["campaignId"]
        recipient_id = recipient["recipientId"]

        event_id = (
            f"EVT-{uuid.uuid4().hex}"
        )

        event_timestamp = utc_timestamp()

        # Store the individual CLICK event.
        events_table.put_item(
            Item={
                "campaignId": campaign_id,
                "eventId": event_id,
                "recipientId": recipient_id,
                "eventType": "CLICK",
                "eventTimestamp": event_timestamp,
                "eventSource": "EMAIL_TRACKING_LINK",
                "trackingToken": tracking_token
            }
        )

        # Update recipient-level click summary.
        recipients_table.update_item(
            Key={
                "campaignId": campaign_id,
                "recipientId": recipient_id
            },
            UpdateExpression=(
                "SET clickedAt = "
                "if_not_exists(clickedAt, :clickedAt), "
                "lastClickedAt = :clickedAt, "
                "updatedAt = :clickedAt "
                "ADD clickCount :increment"
            ),
            ExpressionAttributeValues={
                ":clickedAt": event_timestamp,
                ":increment": 1
            }
        )

        print(
            json.dumps(
                {
                    "message": "Click event recorded",
                    "campaignId": campaign_id,
                    "recipientId": recipient_id,
                    "eventId": event_id,
                    "requestId": context.aws_request_id
                }
            )
        )

        return html_response(
            200,
            build_success_page(
                campaign_id
            )
        )

    except ClientError as error:
        error_details = error.response.get(
            "Error",
            {}
        )

        error_code = error_details.get(
            "Code",
            "AWSClientError"
        )

        error_message = error_details.get(
            "Message",
            "AWS service operation failed"
        )

        print(
            json.dumps(
                {
                    "message": "Tracking operation failed",
                    "errorCode": error_code,
                    "errorDetail": error_message,
                    "requestId": context.aws_request_id
                }
            )
        )

        return json_response(
            500,
            {
                "message": "Unable to record tracking event",
                "errorCode": error_code,
                "requestId": context.aws_request_id
            }
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "message": "Unexpected tracking error",
                    "errorType": type(error).__name__,
                    "errorDetail": str(error)[:300],
                    "requestId": context.aws_request_id
                }
            )
        )

        return json_response(
            500,
            {
                "message": "An unexpected error occurred",
                "errorType": type(error).__name__,
                "requestId": context.aws_request_id
            }
        )
