# insights-api: GET /insights (what Insights reads) and GET /insights/board
# (the Leaderboard's campaign boards and Big Picture), worked out from the
# campaigns, recipients, training-assignments, training-paths and users
# tables and the points ledger's totals. Reads only; nothing typed on a
# landing page is ever in these rows.

data "archive_file" "insights_api" {
  type             = "zip"
  source_file      = "${path.module}/../../backend/insights-api/lambda_function.py"
  output_path      = "${path.module}/build/insights-api.zip"
  output_file_mode = "0644"
}

resource "aws_iam_role" "insights_api" {
  name = "${var.name_prefix}-insights-api-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "insights_api_logs" {
  role       = aws_iam_role.insights_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "insights_api" {
  name = "insights-api-read"
  role = aws_iam_role.insights_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["dynamodb:Scan"]
      Resource = [
        aws_dynamodb_table.campaigns.arn,
        aws_dynamodb_table.recipients.arn,
        aws_dynamodb_table.training_assignments.arn,
        aws_dynamodb_table.training_paths.arn,
        aws_dynamodb_table.users.arn,
      ]
      },
      # GET /insights/board: everyone's points today, from the ledger's TOTAL
      # rows only (the sparse board index), never a scan of the ledger.
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Query"]
        Resource = ["${aws_dynamodb_table.points_ledger.arn}/index/board-points-index"]
    }]
  })
}

resource "aws_lambda_function" "insights_api" {
  function_name    = "${var.name_prefix}-insights-api"
  role             = aws_iam_role.insights_api.arn
  runtime          = "python3.12"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.insights_api.output_path
  source_code_hash = data.archive_file.insights_api.output_base64sha256

  # Reading every recipient row takes a few seconds; HTTP APIs wait up to 30.
  timeout     = 28
  memory_size = 1024

  environment {
    variables = {
      TABLE_PREFIX  = var.name_prefix
      CACHE_SECONDS = "300"
    }
  }
}

resource "aws_lambda_permission" "insights_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.insights_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "insights_api" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.insights_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "insights" {
  for_each  = toset(["GET /insights", "GET /insights/board"])
  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.insights_api.id}"
}
