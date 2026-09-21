# campaigns-api: campaign lifecycle CRUD + list. The wizard draft is a campaign
# row with status = DRAFT; submit/approve/reject stay on the approval Lambda.

data "archive_file" "campaigns_api" {
  type        = "zip"
  source_file = "${path.module}/../../backend/campaigns-api/lambda_function.py"
  output_path = "${path.module}/build/campaigns-api.zip"
}

resource "aws_iam_role" "campaigns_api" {
  name = "${var.name_prefix}-campaigns-api-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "campaigns_api_logs" {
  role       = aws_iam_role.campaigns_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "campaigns_api" {
  name = "campaigns-api-dynamo"
  role = aws_iam_role.campaigns_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ]
      Resource = [
        aws_dynamodb_table.campaigns.arn,
        "${aws_dynamodb_table.campaigns.arn}/index/*",
      ]
    }]
  })
}

resource "aws_lambda_function" "campaigns_api" {
  function_name    = "${var.name_prefix}-campaigns-api"
  role             = aws_iam_role.campaigns_api.arn
  runtime          = "python3.12"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.campaigns_api.output_path
  source_code_hash = data.archive_file.campaigns_api.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_PREFIX = var.name_prefix
    }
  }
}

resource "aws_lambda_permission" "campaigns_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.campaigns_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "campaigns_api" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.campaigns_api.invoke_arn
  payload_format_version = "2.0"
}

locals {
  campaign_routes = [
    "GET /campaigns",
    "POST /campaigns",
    "PUT /campaigns/{campaignId}",
    "DELETE /campaigns/{campaignId}",
  ]
}

resource "aws_apigatewayv2_route" "campaigns" {
  for_each  = toset(local.campaign_routes)
  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.campaigns_api.id}"
}

# This route already existed (click-ops) pointing at the legacy campaign-reader,
# whose response also carried S3 template-validation data. Nothing in the
# frontend consumed it, so it is imported and repointed at campaigns-api for a
# consistent {data} envelope. campaign-reader stays deployed but unrouted.
resource "aws_apigatewayv2_route" "campaign_get_by_id" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /campaigns/{campaignId}"
  target    = "integrations/${aws_apigatewayv2_integration.campaigns_api.id}"
}

import {
  to = aws_apigatewayv2_route.campaign_get_by_id
  id = "1ldu4adn0l/rpo5vbu"
}
