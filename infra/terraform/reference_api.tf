# reference-api: single HTTP API Lambda serving reads for all reference tables
# plus sender-identities CRUD. NEW function -> fully Terraform-managed (code via
# archive_file), unlike the 5 legacy POC functions that deploy via GitHub Actions.

data "archive_file" "reference_api" {
  type        = "zip"
  source_file = "${path.module}/../../backend/reference-api/lambda_function.py"
  output_path = "${path.module}/build/reference-api.zip"
}

resource "aws_iam_role" "reference_api" {
  name = "${var.name_prefix}-reference-api-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "reference_api_logs" {
  role       = aws_iam_role.reference_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "reference_api_dynamo" {
  name = "reference-api-dynamo"
  role = aws_iam_role.reference_api.id
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
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem",
      ]
      Resource = [
        "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.name_prefix}-*",
        "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/${var.name_prefix}-*/index/*",
      ]
    }]
  })
}

resource "aws_lambda_function" "reference_api" {
  function_name    = "${var.name_prefix}-reference-api"
  role             = aws_iam_role.reference_api.arn
  runtime          = "python3.12"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.reference_api.output_path
  source_code_hash = data.archive_file.reference_api.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      TABLE_PREFIX    = var.name_prefix
      UPLOAD_BUCKET   = aws_s3_bucket.assets.bucket
      INGEST_FUNCTION = aws_lambda_function.recipient_ingest.function_name
    }
  }
}

# Allow reference-api to presign uploads and to invoke the ingest Lambda.
resource "aws_iam_role_policy" "reference_api_s3" {
  name = "reference-api-s3-and-invoke"
  role = aws_iam_role.reference_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.assets.arn}/uploads/recipients/*"
      },
      {
        # Needed to enumerate a list's files before deleting them.
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.assets.arn
        Condition = {
          StringLike = { "s3:prefix" = "uploads/recipients/*" }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = aws_lambda_function.recipient_ingest.arn
      },
    ]
  })
}

resource "aws_lambda_permission" "reference_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.reference_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "reference_api" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.reference_api.invoke_arn
  payload_format_version = "2.0"
}

locals {
  reference_routes = [
    "GET /sender-identities",
    "GET /sender-identities/{id}",
    "POST /sender-identities",
    "PUT /sender-identities/{id}",
    "DELETE /sender-identities/{id}",
    "GET /users",
    "GET /users/{id}",
    "GET /scenarios",
    "GET /scenarios/{id}",
    "GET /landing-pages",
    "GET /landing-pages/{id}",
    "GET /user-lists",
    "GET /user-lists/{id}/members",
    "POST /user-lists/bulk-upload",
    "POST /user-lists/{id}/ingest",
    "PUT /user-lists/{id}",
    "DELETE /user-lists/{id}",
    "GET /gamification-rules",
    "GET /training/paths",
    "GET /training/videos",
    "GET /training/quizzes",
    "GET /training/certificates",
    "GET /campaigns-catalog",
  ]
}

resource "aws_apigatewayv2_route" "reference" {
  for_each  = toset(local.reference_routes)
  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.reference_api.id}"
}
