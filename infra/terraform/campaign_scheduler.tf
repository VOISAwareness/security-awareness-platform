# campaign-scheduler: sends approved campaigns at their scheduled start. An
# EventBridge rule runs it every minute; it invokes email-sender (looked up in
# send_routes.tf) for each APPROVED campaign whose start has come. See
# backend/campaign-scheduler/lambda_function.py. Code is packaged here, as
# for points-engine.

data "archive_file" "campaign_scheduler" {
  type             = "zip"
  source_file      = "${path.module}/../../backend/campaign-scheduler/lambda_function.py"
  output_path      = "${path.module}/build/campaign-scheduler.zip"
  output_file_mode = "0644"
}

resource "aws_iam_role" "campaign_scheduler" {
  name = "${var.name_prefix}-campaign-scheduler-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "campaign_scheduler_logs" {
  role       = aws_iam_role.campaign_scheduler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "campaign_scheduler" {
  name = "campaign-scheduler"
  role = aws_iam_role.campaign_scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Read the APPROVED campaigns from the status index; nothing else.
        Effect   = "Allow"
        Action   = "dynamodb:Query"
        Resource = "${aws_dynamodb_table.campaigns.arn}/index/status-index"
      },
      {
        # Start a send. email-sender owns the APPROVED -> SENDING -> SENT change.
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = data.aws_lambda_function.email_sender.arn
      },
    ]
  })
}

resource "aws_lambda_function" "campaign_scheduler" {
  function_name    = "${var.name_prefix}-campaign-scheduler"
  role             = aws_iam_role.campaign_scheduler.arn
  runtime          = "python3.12"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.campaign_scheduler.output_path
  source_code_hash = data.archive_file.campaign_scheduler.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      CAMPAIGNS_TABLE       = aws_dynamodb_table.campaigns.name
      EMAIL_SENDER_FUNCTION = data.aws_lambda_function.email_sender.function_name
      STATUS_INDEX          = "status-index"
      # Campaigns saved before startAt existed: their local startTime is IST.
      DEFAULT_UTC_OFFSET_MINUTES = "330"
      # A start more than an hour past is logged as missed, never sent late.
      MAX_LATENESS_MINUTES = "60"
    }
  }
}

# Every minute: about 43,800 runs a month, inside the Lambda free tier.
resource "aws_cloudwatch_event_rule" "campaign_scheduler" {
  name                = "${var.name_prefix}-campaign-scheduler"
  description         = "Sends approved campaigns at their scheduled start"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "campaign_scheduler" {
  rule = aws_cloudwatch_event_rule.campaign_scheduler.name
  arn  = aws_lambda_function.campaign_scheduler.arn
}

resource "aws_lambda_permission" "campaign_scheduler_events" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.campaign_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.campaign_scheduler.arn
}
