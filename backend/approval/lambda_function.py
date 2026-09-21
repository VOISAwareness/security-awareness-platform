import json
import os
from datetime import UTC, datetime

import boto3
from botocore.exceptions import ClientError

CAMPAIGNS_TABLE = os.environ["CAMPAIGNS_TABLE"]

dynamodb = boto3.resource("dynamodb")
campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)


TRANSITIONS = {
    "SUBMIT": {
        "required_status": "DRAFT",
        "new_status": "PENDING_APPROVAL"
    },
    "APPROVE": {
        "required_status": "PENDING_APPROVAL",
        "new_status": "APPROVED"
    },
    "REJECT": {
        "required_status": "PENDING_APPROVAL",
        "new_status": "REJECTED"
    }
}


def utc_timestamp():
    return datetime.now(UTC).isoformat()


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
        required_status = transition["required_status"]
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

        if current_status != required_status:
            return build_response(
                409,
                {
                    "message": "Invalid campaign status transition",
                    "campaignId": campaign_id,
                    "action": action,
                    "currentStatus": current_status,
                    "requiredStatus": required_status
                }
            )

        if action == "SUBMIT":
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

        update_response = campaigns_table.update_item(
            Key={
                "campaignId": campaign_id
            },
            UpdateExpression=update_expression,
            ConditionExpression="#status = :expectedStatus",
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":newStatus": new_status,
                ":expectedStatus": required_status,
                ":actor": actor,
                ":comments": comments,
                ":changedAt": changed_at
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
