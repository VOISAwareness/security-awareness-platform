import hashlib
import json
import os
import secrets
import uuid
from datetime import UTC, datetime
from html import escape
from urllib.parse import quote, urlparse

import boto3
from botocore.exceptions import ClientError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CAMPAIGNS_TABLE = os.environ["CAMPAIGNS_TABLE"]
RECIPIENTS_TABLE = os.environ["RECIPIENTS_TABLE"]
SES_REGION = os.environ["SES_REGION"]
SES_SENDER_EMAIL = os.environ["SES_SENDER_EMAIL"]
SES_RECIPIENT_EMAIL = os.environ["SES_RECIPIENT_EMAIL"]
API_BASE_URL = os.environ["API_BASE_URL"].rstrip("/")


# ---------------------------------------------------------------------------
# AWS clients and tables
# ---------------------------------------------------------------------------

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")
ses_client = boto3.client(
    "ses",
    region_name=SES_REGION
)

campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)
recipients_table = dynamodb.Table(RECIPIENTS_TABLE)


# ---------------------------------------------------------------------------
# Template contract
# ---------------------------------------------------------------------------

USER_NAME_PLACEHOLDER = "{{USER_NAME}}"
CAMPAIGN_ID_PLACEHOLDER = "{{CAMPAIGN_ID}}"
TRACKING_URL_PLACEHOLDER = "{{TRACKING_URL}}"

REQUIRED_PLACEHOLDERS = [
    USER_NAME_PLACEHOLDER,
    CAMPAIGN_ID_PLACEHOLDER,
    TRACKING_URL_PLACEHOLDER
]


# ---------------------------------------------------------------------------
# General helpers
# ---------------------------------------------------------------------------

def utc_timestamp():
    """Return the current UTC timestamp in ISO-8601 format."""
    return datetime.now(UTC).isoformat()


def build_response(status_code, body):
    """Build an API Gateway-compatible JSON response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        },
        "body": json.dumps(body, default=str)
    }


def get_campaign_id(event):
    """
    Read campaignId from API Gateway path parameters
    or a direct Lambda test event.
    """
    path_parameters = event.get("pathParameters") or {}

    return (
        path_parameters.get("campaignId")
        or event.get("campaignId")
    )


def create_token_fingerprint(token):
    """
    Create a non-reversible token fingerprint for logging.
    """
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_api_base_url():
    """Validate the configured API Gateway base URL."""
    parsed_url = urlparse(API_BASE_URL)

    if parsed_url.scheme != "https":
        raise ValueError(
            "API_BASE_URL must use HTTPS"
        )

    if not parsed_url.netloc:
        raise ValueError(
            "API_BASE_URL must contain a valid hostname"
        )

    if parsed_url.query:
        raise ValueError(
            "API_BASE_URL must not contain a query string"
        )

    if parsed_url.fragment:
        raise ValueError(
            "API_BASE_URL must not contain a URL fragment"
        )


def validate_tracking_url(tracking_url):
    """Validate the generated tracking URL."""
    parsed_url = urlparse(tracking_url)

    if parsed_url.scheme != "https":
        raise ValueError(
            "Generated tracking URL must use HTTPS"
        )

    if not parsed_url.netloc:
        raise ValueError(
            "Generated tracking URL has no hostname"
        )

    if not parsed_url.path.startswith("/track/"):
        raise ValueError(
            "Generated tracking URL must use the /track/ path"
        )


def validate_template(template_html):
    """
    Validate the fixed HTML template.

    Expected link structure:

        {{TRACKING_URL}}Link text</a>

    Lambda replaces {{TRACKING_URL}} with a complete opening anchor.
    """
    missing_placeholders = [
        placeholder
        for placeholder in REQUIRED_PLACEHOLDERS
        if placeholder not in template_html
    ]

    if missing_placeholders:
        raise ValueError(
            "Missing placeholders: "
            + ", ".join(missing_placeholders)
        )

    tracking_count = template_html.count(
        TRACKING_URL_PLACEHOLDER
    )

    closing_anchor_count = template_html.lower().count(
        "</a>"
    )

    if tracking_count < 1:
        raise ValueError(
            "The template must contain at least one "
            "{{TRACKING_URL}} placeholder"
        )

    if closing_anchor_count < tracking_count:
        raise ValueError(
            "Each {{TRACKING_URL}} placeholder must be "
            "followed by a corresponding closing </a> tag"
        )


def build_tracking_anchor(tracking_url):
    """
    Build the complete opening anchor tag.

    String concatenation is used to make the generated HTML explicit.
    """
    safe_url = escape(
        tracking_url,
        quote=True
    )

    return (
        "<"
        + 'a href="'
        + safe_url
        + '"'
        + ' target="_blank"'
        + ' rel="noopener noreferrer"'
        + ' style="'
        + "display:inline-block;"
        + "padding:13px 22px;"
        + "color:#ffffff;"
        + "font-family:Arial,Helvetica,sans-serif;"
        + "font-size:14px;"
        + "font-weight:700;"
        + "line-height:18px;"
        + "text-decoration:none;"
        + '"'
        + ">"
    )


def personalize_template(
    template_html,
    user_name,
    campaign_id,
    tracking_url
):
    """
    Replace template placeholders with safe values.

    {{TRACKING_URL}} becomes the complete opening anchor tag.
    """
    safe_user_name = escape(
        user_name,
        quote=True
    )

    safe_campaign_id = escape(
        campaign_id,
        quote=True
    )

    tracking_anchor = build_tracking_anchor(
        tracking_url
    )

    personalized_html = (
        template_html
        .replace(
            USER_NAME_PLACEHOLDER,
            safe_user_name
        )
        .replace(
            CAMPAIGN_ID_PLACEHOLDER,
            safe_campaign_id
        )
        .replace(
            TRACKING_URL_PLACEHOLDER,
            tracking_anchor
        )
    )

    unresolved_placeholders = [
        placeholder
        for placeholder in REQUIRED_PLACEHOLDERS
        if placeholder in personalized_html
    ]

    if unresolved_placeholders:
        raise ValueError(
            "Unresolved placeholders: "
            + ", ".join(unresolved_placeholders)
        )

    safe_tracking_url = escape(
        tracking_url,
        quote=True
    )

    expected_href = (
        'href="' + safe_tracking_url + '"'
    )

    if expected_href not in personalized_html:
        raise ValueError(
            "Generated tracking href is missing "
            "from the personalized HTML"
        )

    opening_anchor_count = (
        personalized_html.lower().count("<a ")
    )

    closing_anchor_count = (
        personalized_html.lower().count("</a>")
    )

    if opening_anchor_count != closing_anchor_count:
        raise ValueError(
            "Personalized HTML has unmatched anchor tags. "
            f"Opening anchors: {opening_anchor_count}; "
            f"closing anchors: {closing_anchor_count}"
        )

    return personalized_html


# ---------------------------------------------------------------------------
# Failure-state helpers
# ---------------------------------------------------------------------------

def mark_campaign_failed(campaign_id, reason):
    """Mark the campaign as SEND_FAILED."""
    failed_at = utc_timestamp()

    try:
        campaigns_table.update_item(
            Key={
                "campaignId": campaign_id
            },
            UpdateExpression=(
                "SET #status = :failed, "
                "failureReason = :reason, "
                "failedAt = :failedAt, "
                "updatedAt = :failedAt"
            ),
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":failed": "SEND_FAILED",
                ":reason": reason[:500],
                ":failedAt": failed_at
            }
        )

    except Exception as update_error:
        print(
            json.dumps(
                {
                    "message": (
                        "Unable to record campaign failure"
                    ),
                    "campaignId": campaign_id,
                    "errorType": (
                        type(update_error).__name__
                    )
                }
            )
        )


def mark_recipient_failed(
    campaign_id,
    recipient_id,
    reason
):
    """Mark a recipient as SEND_FAILED."""
    failed_at = utc_timestamp()

    try:
        recipients_table.update_item(
            Key={
                "campaignId": campaign_id,
                "recipientId": recipient_id
            },
            UpdateExpression=(
                "SET sendStatus = :failed, "
                "failureReason = :reason, "
                "failedAt = :failedAt, "
                "updatedAt = :failedAt"
            ),
            ExpressionAttributeValues={
                ":failed": "SEND_FAILED",
                ":reason": reason[:500],
                ":failedAt": failed_at
            }
        )

    except Exception as update_error:
        print(
            json.dumps(
                {
                    "message": (
                        "Unable to record recipient failure"
                    ),
                    "campaignId": campaign_id,
                    "recipientId": recipient_id,
                    "errorType": (
                        type(update_error).__name__
                    )
                }
            )
        )


# ---------------------------------------------------------------------------
# Main Lambda handler
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    """Send one recipient-specific tracked POC email."""
    campaign_id = get_campaign_id(event)

    recipient_id = None
    send_started = False

    if not campaign_id:
        return build_response(
            400,
            {
                "message": "campaignId is required"
            }
        )

    try:
        validate_api_base_url()

        # Load campaign.
        campaign_response = campaigns_table.get_item(
            Key={
                "campaignId": campaign_id
            }
        )

        campaign = campaign_response.get("Item")

        if campaign is None:
            return build_response(
                404,
                {
                    "message": "Campaign not found",
                    "campaignId": campaign_id
                }
            )

        current_status = campaign.get("status")

        if current_status != "APPROVED":
            return build_response(
                409,
                {
                    "message": (
                        "Only APPROVED campaigns can be sent"
                    ),
                    "campaignId": campaign_id,
                    "currentStatus": current_status
                }
            )

        template_bucket = campaign.get(
            "templateBucket"
        )

        template_key = campaign.get(
            "templateKey"
        )

        if not template_bucket or not template_key:
            return build_response(
                400,
                {
                    "message": (
                        "Campaign template configuration "
                        "is missing"
                    ),
                    "campaignId": campaign_id
                }
            )

        # Load and validate the template BEFORE locking the campaign.
        template_response = s3_client.get_object(
            Bucket=template_bucket,
            Key=template_key
        )

        template_html = (
            template_response["Body"]
            .read()
            .decode("utf-8")
        )

        validate_template(template_html)

        # Generate the recipient-specific tracking information.
        recipient_id = (
            f"REC-{uuid.uuid4().hex}"
        )

        tracking_token = (
            secrets.token_urlsafe(32)
        )

        token_fingerprint = (
            create_token_fingerprint(
                tracking_token
            )
        )

        encoded_tracking_token = quote(
            tracking_token,
            safe=""
        )

        tracking_url = (
            f"{API_BASE_URL}/track/"
            f"{encoded_tracking_token}"
        )

        validate_tracking_url(tracking_url)

        user_name = "POC User"

        personalized_html = personalize_template(
            template_html=template_html,
            user_name=user_name,
            campaign_id=campaign_id,
            tracking_url=tracking_url
        )

        # Lock campaign only after all validation succeeds.
        sending_at = utc_timestamp()

        campaigns_table.update_item(
            Key={
                "campaignId": campaign_id
            },
            UpdateExpression=(
                "SET #status = :sending, "
                "sendingStartedAt = :sendingAt, "
                "updatedAt = :sendingAt"
            ),
            ConditionExpression="#status = :approved",
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":approved": "APPROVED",
                ":sending": "SENDING",
                ":sendingAt": sending_at
            }
        )

        send_started = True
        created_at = utc_timestamp()

        # Store the recipient before sending.
        recipients_table.put_item(
            Item={
                "campaignId": campaign_id,
                "recipientId": recipient_id,
                "recipientName": user_name,
                "recipientEmail": (
                    SES_RECIPIENT_EMAIL
                ),
                "trackingToken": tracking_token,
                "trackingUrl": tracking_url,
                "tokenFingerprint": (
                    token_fingerprint
                ),
                "sendStatus": "PENDING",
                "createdAt": created_at,
                "updatedAt": created_at
            },
            ConditionExpression=(
                "attribute_not_exists(campaignId) "
                "AND attribute_not_exists(recipientId)"
            )
        )

        subject = campaign.get(
            "subject",
            "Security Awareness Notification"
        )

        parsed_tracking_url = urlparse(
            tracking_url
        )

        print(
            json.dumps(
                {
                    "message": "Prepared tracked email",
                    "campaignId": campaign_id,
                    "recipientId": recipient_id,
                    "tokenFingerprint": token_fingerprint,
                    "trackingHost": (
                        parsed_tracking_url.netloc
                    ),
                    "trackingPathValid": (
                        parsed_tracking_url.path.startswith(
                            "/track/"
                        )
                    ),
                    "trackingUrlPresentInHtml": (
                        tracking_url in personalized_html
                    ),
                    "openingAnchorCount": (
                        personalized_html
                        .lower()
                        .count("<a ")
                    ),
                    "closingAnchorCount": (
                        personalized_html
                        .lower()
                        .count("</a>")
                    ),
                    "requestId": context.aws_request_id
                }
            )
        )

        # Send the email through SES.
        ses_response = ses_client.send_email(
            Source=SES_SENDER_EMAIL,
            Destination={
                "ToAddresses": [
                    SES_RECIPIENT_EMAIL
                ]
            },
            Message={
                "Subject": {
                    "Data": subject,
                    "Charset": "UTF-8"
                },
                "Body": {
                    "Html": {
                        "Data": personalized_html,
                        "Charset": "UTF-8"
                    },
                    "Text": {
                        "Data": (
                            "Security Awareness POC "
                            "notification.\n\n"
                            f"Hello {user_name},\n\n"
                            f"Campaign reference: "
                            f"{campaign_id}\n\n"
                            "Open the security notice:\n"
                            f"{tracking_url}"
                        ),
                        "Charset": "UTF-8"
                    }
                }
            }
        )

        message_id = ses_response["MessageId"]
        sent_at = utc_timestamp()

        # Mark the recipient as SENT.
        recipients_table.update_item(
            Key={
                "campaignId": campaign_id,
                "recipientId": recipient_id
            },
            UpdateExpression=(
                "SET sendStatus = :sent, "
                "sentAt = :sentAt, "
                "sesMessageId = :messageId, "
                "updatedAt = :sentAt "
                "REMOVE failureReason, failedAt"
            ),
            ExpressionAttributeValues={
                ":sent": "SENT",
                ":sentAt": sent_at,
                ":messageId": message_id
            }
        )

        # Mark the campaign as SENT.
        campaigns_table.update_item(
            Key={
                "campaignId": campaign_id
            },
            UpdateExpression=(
                "SET #status = :sent, "
                "sentAt = :sentAt, "
                "sesMessageId = :messageId, "
                "recipientCount = :recipientCount, "
                "updatedAt = :sentAt "
                "REMOVE failureReason, failedAt"
            ),
            ConditionExpression="#status = :sending",
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":sending": "SENDING",
                ":sent": "SENT",
                ":sentAt": sent_at,
                ":messageId": message_id,
                ":recipientCount": 1
            }
        )

        print(
            json.dumps(
                {
                    "message": (
                        "Tracked campaign email sent"
                    ),
                    "campaignId": campaign_id,
                    "recipientId": recipient_id,
                    "tokenFingerprint": (
                        token_fingerprint
                    ),
                    "sesMessageId": message_id,
                    "requestId": (
                        context.aws_request_id
                    )
                }
            )
        )

        return build_response(
            200,
            {
                "message": (
                    "Tracked campaign email "
                    "sent successfully"
                ),
                "campaignId": campaign_id,
                "campaignStatus": "SENT",
                "recipientId": recipient_id,
                "sesMessageId": message_id,
                "sentAt": sent_at
            }
        )

    except ValueError as error:
        failure_reason = str(error)

        if recipient_id and send_started:
            mark_recipient_failed(
                campaign_id,
                recipient_id,
                failure_reason
            )

        if send_started:
            mark_campaign_failed(
                campaign_id,
                failure_reason
            )

        print(
            json.dumps(
                {
                    "message": "Email validation failed",
                    "campaignId": campaign_id,
                    "failureReason": failure_reason,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            400,
            {
                "message": failure_reason,
                "campaignId": campaign_id
            }
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

        if error_code == "ConditionalCheckFailedException":
            return build_response(
                409,
                {
                    "message": (
                        "Campaign is no longer "
                        "available for sending"
                    ),
                    "campaignId": campaign_id
                }
            )

        failure_reason = (
            f"{error_code}: {error_message}"
        )

        if recipient_id and send_started:
            mark_recipient_failed(
                campaign_id,
                recipient_id,
                failure_reason
            )

        if send_started:
            mark_campaign_failed(
                campaign_id,
                failure_reason
            )

        print(
            json.dumps(
                {
                    "message": (
                        "Tracked email operation failed"
                    ),
                    "campaignId": campaign_id,
                    "errorCode": error_code,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            500,
            {
                "message": (
                    "Unable to send tracked campaign email"
                ),
                "campaignId": campaign_id,
                "errorCode": error_code,
                "requestId": context.aws_request_id
            }
        )

    except Exception as error:
        failure_reason = (
            f"Unexpected error: "
            f"{type(error).__name__}"
        )

        if recipient_id and send_started:
            mark_recipient_failed(
                campaign_id,
                recipient_id,
                failure_reason
            )

        if send_started:
            mark_campaign_failed(
                campaign_id,
                failure_reason
            )

        print(
            json.dumps(
                {
                    "message": (
                        "Unexpected tracked sender error"
                    ),
                    "campaignId": campaign_id,
                    "errorType": (
                        type(error).__name__
                    ),
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            500,
            {
                "message": (
                    "An unexpected error occurred"
                ),
                "campaignId": campaign_id,
                "requestId": context.aws_request_id
            }
        )
