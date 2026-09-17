import json
import os

import boto3
from botocore.exceptions import ClientError


dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")

CAMPAIGNS_TABLE = os.environ["CAMPAIGNS_TABLE"]
TEMPLATE_BUCKET = os.environ["TEMPLATE_BUCKET"]
TEMPLATE_KEY = os.environ["TEMPLATE_KEY"]

campaigns_table = dynamodb.Table(CAMPAIGNS_TABLE)


def build_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps(body)
    }


def lambda_handler(event, context):
    print(
        json.dumps(
            {
                "message": "Campaign reader invoked",
                "requestId": context.aws_request_id
            }
        )
    )

    path_parameters = event.get("pathParameters") or {}

    campaign_id = (
        path_parameters.get("campaignId")
        or event.get("campaignId")
        or "CMP-POC-001"
    )

    try:
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

        template_response = s3_client.get_object(
            Bucket=TEMPLATE_BUCKET,
            Key=TEMPLATE_KEY
        )

        template_html = (
            template_response["Body"]
            .read()
            .decode("utf-8")
        )

        required_placeholders = [
            "{{USER_NAME}}",
            "{{TRACKING_URL}}",
            "{{CAMPAIGN_ID}}"
        ]

        placeholder_results = {
            placeholder: placeholder in template_html
            for placeholder in required_placeholders
        }

        all_placeholders_present = all(
            placeholder_results.values()
        )

        return build_response(
            200,
            {
                "message": "Campaign and email template loaded successfully",
                "campaign": campaign,
                "template": {
                    "bucket": TEMPLATE_BUCKET,
                    "key": TEMPLATE_KEY,
                    "sizeBytes": len(template_html.encode("utf-8")),
                    "placeholderValidation": placeholder_results,
                    "allPlaceholdersPresent": all_placeholders_present
                }
            }
        )

    except ClientError as error:
        error_code = error.response.get("Error", {}).get(
            "Code",
            "AWSClientError"
        )

        print(
            json.dumps(
                {
                    "message": "AWS service operation failed",
                    "errorCode": error_code,
                    "requestId": context.aws_request_id
                }
            )
        )

        return build_response(
            500,
            {
                "message": "Unable to load campaign or email template",
                "errorCode": error_code,
                "requestId": context.aws_request_id
            }
        )

    except Exception:
        print(
            json.dumps(
                {
                    "message": "Unexpected function error",
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