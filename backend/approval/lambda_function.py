import json
import os
from datetime import UTC, datetime

import boto3
from botocore.exceptions import ClientError

CAMPAIGNS_TABLE = os.environ["CAMPAIGNS_TABLE"]

dynamodb = boto3.resource("dynamodb")
campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)


# `required_statuses` is a tuple: SUBMIT accepts more than one starting state.
# A REJECTED campaign must be able to go back for review once its owner has
# fixed it — otherwise rejection is a dead end, the campaign is editable but
# permanently unsubmittable, and the only way out is to rebuild it from scratch.
TRANSITIONS = {
    "SUBMIT": {
        "required_statuses": ("DRAFT", "REJECTED"),
        "new_status": "PENDING_APPROVAL"
    },
    "APPROVE": {
        "required_statuses": ("PENDING_APPROVAL",),
        "new_status": "APPROVED"
    },
    "REJECT": {
        "required_statuses": ("PENDING_APPROVAL",),
        "new_status": "REJECTED"
    }
}


def utc_timestamp():
    return datetime.now(UTC).isoformat()


# Fields a campaign must carry before it can leave DRAFT. The wizard's Review &
# Publish step performs NO validation of its own — every missing value silently
# falls back to a demo default — so this is the only place it is enforced.
def validate_for_submit(campaign):
    """Return a list of human-readable problems blocking submission."""
    problems = []

    def missing(field):
        return not str(campaign.get(field) or "").strip()

    for field, label in (
        ("campaignTitle", "Campaign Title"),
        ("campaignDescription", "Campaign Description"),
        ("startTime", "Start Time"),
        ("senderEmailId", "Sender Email ID"),
        ("emailSubject", "Email Subject"),
        ("selectedListId", "Recipient List"),
        ("trainingId", "Training Path"),
    ):
        if missing(field):
            problems.append(f"{label} is required")

    # End time may be omitted only when the campaign auto-ends after sending.
    if missing("endTime") and not campaign.get("autoEndPostSending"):
        problems.append(
            "End Time is required unless the campaign auto-ends after sending"
        )

    # The wizard accepts either a catalogue page or hand-authored HTML.
    if missing("landingPageId") and missing("landingPageContent"):
        problems.append("A Landing Page must be attached or designed")

    return problems


def build_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body, default=str)
    }


def parse_request_body(event):
    body = event.get("body")

    if body is None:
        return {}

    if isinstance(body, dict):
        return body

    try:
        return json.loads(body)
    except json.JSONDecodeError as err:
        raise ValueError("Request body must contain valid JSON") from err


def identify_action(event):
    route_key = str(event.get("routeKey", "")).lower()
    raw_path = str(event.get("rawPath", "")).lower().rstrip("/")

    if route_key.endswith("/submit") or raw_path.endswith("/submit"):
        return "SUBMIT"

    if route_key.endswith("/approve") or raw_path.endswith("/approve"):
        return "APPROVE"

    if route_key.endswith("/reject") or raw_path.endswith("/reject"):
        return "REJECT"

    # Allows direct Lambda console testing during the POC.
    return str(event.get("action", "")).upper()


def lambda_handler(event, context):
    try:
        path_parameters = event.get("pathParameters") or {}
        request_body = parse_request_body(event)

        campaign_id = (
            path_parameters.get("campaignId")
            or event.get("campaignId")
        )

        action = identify_action(event)

        # Temporary POC identity.
        # Later this will come from authenticated Entra ID claims.
        actor = (
            request_body.get("actor")
            or event.get("actor")
        )

        comments = (
            request_body.get("comments")
            or event.get("comments")
            or ""
        )

        if not campaign_id:
            return build_response(
                400,
                {
                    "message": "campaignId is required"
                }
            )

        if action not in TRANSITIONS:
            return build_response(
                400,
                {
                    "message": "Unable to identify workflow action",
                    "allowedActions": [
                        "SUBMIT",
                        "APPROVE",
                        "REJECT"
                    ]
                }
            )

        if not actor:
            return build_response(
                400,
                {
                    "message": "actor is required for the POC"
                }
            )

        if action == "REJECT" and not comments.strip():
            return build_response(
                400,
                {
                    "message": "comments are required when rejecting a campaign"
                }
            )

        transition = TRANSITIONS[action]
        required_statuses = transition["required_statuses"]
        new_status = transition["new_status"]
        changed_at = utc_timestamp()

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

        if current_status not in required_statuses:
            return build_response(
                409,
                {
                    "message": "Invalid campaign status transition",
                    "campaignId": campaign_id,
                    "action": action,
                    "currentStatus": current_status,
                    "requiredStatus": list(required_statuses)
                }
            )

        if action == "SUBMIT":
            problems = validate_for_submit(campaign)
            if problems:
                return build_response(
                    400,
                    {
                        "message": "Campaign is not ready to submit",
                        "campaignId": campaign_id,
                        "problems": problems
                    }
                )

            update_expression = (
                "SET #status = :newStatus, "
                "submittedBy = :actor, "
                "submittedAt = :changedAt, "
                "submissionComments = :comments, "
                "updatedAt = :changedAt"
            )

        elif action == "APPROVE":
            update_expression = (
                "SET #status = :newStatus, "
                "approvedBy = :actor, "
                "approvedAt = :changedAt, "
                "approvalComments = :comments, "
                "updatedAt = :changedAt"
            )

        else:
            update_expression = (
                "SET #status = :newStatus, "
                "rejectedBy = :actor, "
                "rejectedAt = :changedAt, "
                "rejectionComments = :comments, "
                "updatedAt = :changedAt"
            )

        # Guard against a concurrent transition: the status must still be one of
        # the ones we checked above when the write lands.
        status_placeholders = {
            f":expectedStatus{i}": value
            for i, value in enumerate(required_statuses)
        }
        condition = (
            f"#status IN ({', '.join(status_placeholders)})"
        )

        update_response = campaigns_table.update_item(
            Key={
                "campaignId": campaign_id
            },
            UpdateExpression=update_expression,
            ConditionExpression=condition,
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":newStatus": new_status,
                ":actor": actor,
                ":comments": comments,
                ":changedAt": changed_at,
                **status_placeholders
            },
            ReturnValues="ALL_NEW"
        )

        print(
            json.dumps(
                {
                    "message": "Campaign workflow updated",
                    "campaignId": campaign_id,
                    "action": action,
                    "previousStatus": current_status,
                    "newStatus": new_status,
                    "actor": actor,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            200,
            {
                "message": "Campaign workflow updated successfully",
                "campaignId": campaign_id,
                "action": action,
                "previousStatus": current_status,
                "currentStatus": new_status,
                "actor": actor,
                "changedAt": changed_at,
                "campaign": update_response["Attributes"]
            }
        )

    except ValueError as error:
        return build_response(
            400,
            {
                "message": str(error)
            }
        )

    except campaigns_table.meta.client.exceptions.ConditionalCheckFailedException:
        return build_response(
            409,
            {
                "message": "Campaign status changed before the action completed"
            }
        )

    except ClientError as error:
        error_code = error.response.get(
            "Error", {}
        ).get("Code", "AWSClientError")

        print(
            json.dumps(
                {
                    "message": "Campaign workflow operation failed",
                    "errorCode": error_code,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            500,
            {
                "message": "Unable to update campaign workflow",
                "errorCode": error_code,
                "requestId": context.aws_request_id
            }
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "message": "Unexpected workflow error",
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
