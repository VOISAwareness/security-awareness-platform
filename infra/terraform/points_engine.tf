# points-engine: turns tracked campaign events into points. The events table's
# stream (new rows only) triggers it; it writes the points ledger
# (tables.tf: points_ledger). See backend/points-engine/lambda_function.py.

data "archive_file" "points_engine" {
  type        = "zip"
  source_file = "${path.module}/../../backend/points-engine/lambda_function.py"
  output_path = "${path.module}/build/points-engine.zip"
  # Same bytes on every machine, so the code hash only changes when the code does.
  output_file_mode = "0644"
}

resource "aws_iam_role" "points_engine" {
  name = "${var.name_prefix}-points-engine-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Logs, and reading the events stream.
resource "aws_iam_role_policy_attachment" "points_engine_stream" {
  role       = aws_iam_role.points_engine.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole"
}

resource "aws_iam_role_policy" "points_engine" {
  name = "points-engine-dynamo"
  role = aws_iam_role.points_engine.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Who the event was for, whether the campaign was a test, what the
        # action is worth.
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:Scan"]
        Resource = [
          aws_dynamodb_table.recipients.arn,
          aws_dynamodb_table.campaigns.arn,
          aws_dynamodb_table.gamification_rules.arn,
        ]
      },
      {
        # The entry and the total, written together in one transaction.
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem"]
        Resource = aws_dynamodb_table.points_ledger.arn
      },
    ]
  })
}

resource "aws_lambda_function" "points_engine" {
  function_name    = "${var.name_prefix}-points-engine"
  role             = aws_iam_role.points_engine.arn
  runtime          = "python3.12"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.points_engine.output_path
  source_code_hash = data.archive_file.points_engine.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TABLE_PREFIX = var.name_prefix
    }
  }
}

resource "aws_lambda_event_source_mapping" "points_engine" {
  event_source_arn  = aws_dynamodb_table.events.stream_arn
  function_name     = aws_lambda_function.points_engine.arn
  starting_position = "LATEST"
  batch_size        = 25

  # Only new event rows wake the Lambda.
  filter_criteria {
    filter {
      pattern = jsonencode({ eventName = ["INSERT"] })
    }
  }

  # A record that fails (DynamoDB busy) is retried on its own; one that can
  # never score is skipped in code, so retries never block the stream for long.
  function_response_types        = ["ReportBatchItemFailures"]
  bisect_batch_on_function_error = true
  maximum_retry_attempts         = 10
  maximum_record_age_in_seconds  = 86400
}
