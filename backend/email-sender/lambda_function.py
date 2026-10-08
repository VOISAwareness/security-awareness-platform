import hashlib
import json
import os
import secrets
import uuid
from datetime import UTC, datetime
from html import escape
from urllib.parse import quote, urlparse

import boto3
from boto3.dynamodb.conditions import Key
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

# The recipient list (ingested from the uploaded DL) lives in this table, keyed
# by userListId (hash) + email (range). Optional: when unset, a campaign with a
# selectedListId cannot be resolved and the send returns 400. Set it in the
# Lambda's click-ops env config (e.g. security-awareness-poc-user-list-members).
USER_LIST_MEMBERS_TABLE = os.environ.get("USER_LIST_MEMBERS_TABLE")

members_table = (
    dynamodb.Table(USER_LIST_MEMBERS_TABLE)
    if USER_LIST_MEMBERS_TABLE
    else None
)


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
# Inline email body (how the app saves campaigns)
# ---------------------------------------------------------------------------
#
# Campaigns created through the wizard store their HTML inline on the campaign
# record as `emailBody`, with a ready-made anchor whose href is a link
# placeholder. Unlike the legacy S3 template, the anchor is already present, so
# the phishing link placeholder is replaced with the tracking URL in place — no
# anchor is injected. The recipient-name placeholder is substituted too.

INLINE_LINK_PLACEHOLDERS = (
    "{{phishLink}}",
    "{{PHISH_LINK}}",
    "{{phishingLink}}",
    "{{trackingUrl}}",
    "{{TRACKING_URL}}",
)

INLINE_NAME_PLACEHOLDERS = (
    "{{userName}}",
    "{{USER_NAME}}",
    "{{UserName}}",
    "@UserName",
    "@userName",
)


def _replace_all(text, placeholders, value):
    """Replace every placeholder in `placeholders` with `value`."""
    for placeholder in placeholders:
        text = text.replace(placeholder, value)
    return text


def inline_link_present(email_body):
    """True if the inline body carries a link placeholder to track."""
    return isinstance(email_body, str) and any(
        placeholder in email_body
        for placeholder in INLINE_LINK_PLACEHOLDERS
    )


def render_inline_body(email_body, user_name, tracking_url):
    """
    Render an inline campaign `emailBody` for sending.

    The body must contain at least one link placeholder; it is replaced with
    the tracking URL (HTML-escaped for an href context). The recipient-name
    placeholder, if present, is replaced with the escaped name. No anchor tag
    is injected — the body already carries its own anchor.
    """
    if not isinstance(email_body, str) or not email_body.strip():
        raise ValueError("Campaign emailBody is empty")

    if not inline_link_present(email_body):
        raise ValueError(
            "Email body has no link placeholder; expected one of: "
            + ", ".join(INLINE_LINK_PLACEHOLDERS)
        )

    safe_url = escape(tracking_url, quote=True)
    safe_user_name = escape(user_name, quote=True)

    rendered_html = _replace_all(
        email_body,
        INLINE_LINK_PLACEHOLDERS,
        safe_url
    )

    rendered_html = _replace_all(
        rendered_html,
        INLINE_NAME_PLACEHOLDERS,
        safe_user_name
    )

    if safe_url not in rendered_html:
        raise ValueError(
            "Tracking URL is missing from the rendered email body"
        )

    return rendered_html


def render_subject(subject, user_name):
    """
    Substitute the recipient-name placeholder in a plain-text subject line.

    The subject is not HTML, so the raw name is used (no escaping).
    """
    if not isinstance(subject, str) or not subject.strip():
        return "Security Awareness Notification"

    return _replace_all(subject, INLINE_NAME_PLACEHOLDERS, user_name)


# ---------------------------------------------------------------------------
# Recipient resolution
# ---------------------------------------------------------------------------
#
# A campaign is sent to the members of its selected recipient list — the DL the
# user uploaded, which recipient-ingest parsed from S3 into the members table.
# A single chosen user, or (for a bare smoke test) the configured verified
# recipient, are the fallbacks. In the SES sandbox only verified addresses are
# actually delivered to; unverified ones are rejected per-recipient and recorded
# as failures, so uploading a real DL cannot blast real employees.

DEFAULT_RECIPIENT_NAME = "POC User"


def query_list_members(list_id):
    """Return [{email, name}] for every member of a recipient list."""
    recipients = []
    query_kwargs = {"KeyConditionExpression": Key("userListId").eq(list_id)}

    while True:
        response = members_table.query(**query_kwargs)
        for item in response.get("Items", []):
            email = item.get("email")
            if email:
                recipients.append(
                    {
                        "email": email,
                        "name": item.get("userName") or DEFAULT_RECIPIENT_NAME,
                    }
                )
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        query_kwargs["ExclusiveStartKey"] = last_key

    return recipients


def resolve_recipients(campaign):
    """
    Decide who a campaign is sent to.

    Priority: the selected recipient list's members -> a single chosen user ->
    the configured verified recipient (a bare smoke test with no audience).
    Raises ValueError when a list is selected but the members table is not
    configured, so the caller returns 400 before locking the campaign.
    """
    list_id = campaign.get("selectedListId")
    single_email = campaign.get("selectedSingleUserEmail")

    if list_id:
        if members_table is None:
            raise ValueError(
                "USER_LIST_MEMBERS_TABLE is not configured; "
                "cannot resolve the recipient list"
            )
        return query_list_members(list_id)

    if single_email:
        return [{"email": single_email, "name": DEFAULT_RECIPIENT_NAME}]

    return [{"email": SES_RECIPIENT_EMAIL, "name": DEFAULT_RECIPIENT_NAME}]


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

        email_body = campaign.get("emailBody")

        template_bucket = campaign.get(
            "templateBucket"
        )

        template_key = campaign.get(
            "templateKey"
        )

        # A send needs either the inline emailBody (how the wizard saves
        # campaigns) or a legacy S3 template. Inline bodies are preferred;
        # the S3 path stays for templates created before inline bodies.
        has_s3_template = bool(template_bucket and template_key)

        has_inline_body = (
            isinstance(email_body, str)
            and email_body.strip() != ""
        )

        if not has_s3_template and not has_inline_body:
            return build_response(
                400,
                {
                    "message": (
                        "Campaign has no email body or "
                        "template to send"
                    ),
                    "campaignId": campaign_id
                }
            )

        template_html = None

        if has_s3_template:
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

        # Pre-validate the inline body once, before locking, so a malformed
        # body fails with 400 rather than leaving the campaign stuck in SENDING.
        if has_inline_body and not inline_link_present(email_body):
            return build_response(
                400,
                {
                    "message": (
                        "Email body has no link placeholder; expected "
                        "one of: " + ", ".join(INLINE_LINK_PLACEHOLDERS)
                    ),
                    "campaignId": campaign_id
                }
            )

        # Resolve who to send to: the selected recipient list's members (the
        # uploaded DL), a single chosen user, or the configured verified
        # recipient. A missing members table for a list-based campaign raises
        # ValueError -> 400 below, before anything is locked.
        recipients = resolve_recipients(campaign)

        if not recipients:
            return build_response(
                400,
                {
                    "message": (
                        "Campaign has no recipients. Attach a recipient "
                        "list or a single user before sending."
                    ),
                    "campaignId": campaign_id
                }
            )

        raw_subject = (
            campaign.get("emailSubject")
            or campaign.get("subject")
            or "Security Awareness Notification"
        )

        # Lock the campaign once, before any send (optimistic APPROVED ->
        # SENDING). A concurrent change raises ConditionalCheckFailedException,
        # handled as a 409 by the outer ClientError branch.
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

        sent = []
        failed = []

        for recipient in recipients:
            recipient_email = recipient["email"]
            recipient_name = recipient.get("name") or "POC User"

            # Fresh recipient id + tracking token per recipient.
            recipient_id = f"REC-{uuid.uuid4().hex}"
            tracking_token = secrets.token_urlsafe(32)
            token_fingerprint = create_token_fingerprint(tracking_token)
            encoded_tracking_token = quote(tracking_token, safe="")
            tracking_url = (
                f"{API_BASE_URL}/track/{encoded_tracking_token}"
            )

            try:
                validate_tracking_url(tracking_url)

                if has_s3_template:
                    personalized_html = personalize_template(
                        template_html=template_html,
                        user_name=recipient_name,
                        campaign_id=campaign_id,
                        tracking_url=tracking_url
                    )
                else:
                    personalized_html = render_inline_body(
                        email_body=email_body,
                        user_name=recipient_name,
                        tracking_url=tracking_url
                    )

                subject = render_subject(raw_subject, recipient_name)
                created_at = utc_timestamp()

                # Store the recipient before sending.
                recipients_table.put_item(
                    Item={
                        "campaignId": campaign_id,
                        "recipientId": recipient_id,
                        "recipientName": recipient_name,
                        "recipientEmail": recipient_email,
                        "trackingToken": tracking_token,
                        "trackingUrl": tracking_url,
                        "tokenFingerprint": token_fingerprint,
                        "sendStatus": "PENDING",
                        "createdAt": created_at,
                        "updatedAt": created_at
                    },
                    ConditionExpression=(
                        "attribute_not_exists(campaignId) "
                        "AND attribute_not_exists(recipientId)"
                    )
                )

                print(
                    json.dumps(
                        {
                            "message": "Prepared tracked email",
                            "campaignId": campaign_id,
                            "recipientId": recipient_id,
                            "tokenFingerprint": token_fingerprint,
                            "trackingUrlPresentInHtml": (
                                tracking_url in personalized_html
                            ),
                            "requestId": context.aws_request_id
                        }
                    )
                )

                # Send the email through SES.
                ses_response = ses_client.send_email(
                    Source=SES_SENDER_EMAIL,
                    Destination={
                        "ToAddresses": [recipient_email]
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
                                    f"Hello {recipient_name},\n\n"
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

                sent.append(
                    {
                        "recipientId": recipient_id,
                        "email": recipient_email,
                        "sesMessageId": message_id
                    }
                )

                print(
                    json.dumps(
                        {
                            "message": "Tracked campaign email sent",
                            "campaignId": campaign_id,
                            "recipientId": recipient_id,
                            "tokenFingerprint": token_fingerprint,
                            "sesMessageId": message_id,
                            "requestId": context.aws_request_id
                        }
                    )
                )

            except ClientError as recipient_error:
                # One recipient failing (e.g. the SES sandbox rejecting an
                # unverified address) must not abort the whole campaign.
                error_code = recipient_error.response.get(
                    "Error", {}
                ).get("Code", "AWSClientError")

                # The recipient row may not exist if the put itself failed.
                mark_recipient_failed(campaign_id, recipient_id, error_code)
                failed.append(
                    {
                        "recipientId": recipient_id,
                        "email": recipient_email,
                        "reason": error_code
                    }
                )

                print(
                    json.dumps(
                        {
                            "message": "Recipient send failed",
                            "campaignId": campaign_id,
                            "recipientId": recipient_id,
                            "errorCode": error_code,
                            "requestId": context.aws_request_id
                        }
                    )
                )

            except ValueError as recipient_error:
                reason = str(recipient_error)
                mark_recipient_failed(campaign_id, recipient_id, reason)
                failed.append(
                    {
                        "recipientId": recipient_id,
                        "email": recipient_email,
                        "reason": reason
                    }
                )

        sent_count = len(sent)
        failed_count = len(failed)
        completed_at = utc_timestamp()

        if sent_count > 0:
            # At least one delivered -> the campaign counts as SENT.
            last_message_id = sent[-1]["sesMessageId"]

            campaigns_table.update_item(
                Key={
                    "campaignId": campaign_id
                },
                UpdateExpression=(
                    "SET #status = :sent, "
                    "sentAt = :sentAt, "
                    "sesMessageId = :messageId, "
                    "recipientCount = :recipientCount, "
                    "failedCount = :failedCount, "
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
                    ":sentAt": completed_at,
                    ":messageId": last_message_id,
                    ":recipientCount": sent_count,
                    ":failedCount": failed_count
                }
            )

            status_label = "SENT"
            http_status = 200
        else:
            # Nobody could be emailed (e.g. every address unverified in the
            # sandbox). Record the campaign as failed with the first reason.
            reason = (
                failed[0]["reason"]
                if failed
                else "No recipients could be emailed"
            )
            mark_campaign_failed(campaign_id, reason)
            status_label = "FAILED"
            http_status = 502

        print(
            json.dumps(
                {
                    "message": "Campaign send complete",
                    "campaignId": campaign_id,
                    "sentCount": sent_count,
                    "failedCount": failed_count,
                    "campaignStatus": status_label,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            http_status,
            {
                "message": (
                    f"Campaign send complete: {sent_count} sent, "
                    f"{failed_count} failed"
                ),
                "campaignId": campaign_id,
                "campaignStatus": status_label,
                "sentCount": sent_count,
                "failedCount": failed_count,
                "sent": sent,
                "failed": failed
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
