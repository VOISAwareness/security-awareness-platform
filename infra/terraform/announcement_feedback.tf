# What happens to each announcement email after SES accepts it. announcement-
# sender sends through this configuration set, tagging each email with its
# roll-out and person; SES publishes the set's Delivery, Bounce and Complaint
# events to an SNS topic, which invokes announcement-feedback to mark the
# person's row in recipients. See backend/announcement-feedback/.

resource "aws_ses_configuration_set" "announcements" {
  name = "${var.name_prefix}-announcements"
}

resource "aws_sns_topic" "announcement_feedback" {
  name = "${var.name_prefix}-announcement-feedback"
}

# Only SES, for this account's configuration set, may publish to the topic.
resource "aws_sns_topic_policy" "announcement_feedback" {
  arn = aws_sns_topic.announcement_feedback.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "SesPublishesFeedback"
      Effect    = "Allow"
      Principal = { Service = "ses.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.announcement_feedback.arn
      Condition = {
        StringEquals = {
          "AWS:SourceAccount" = data.aws_caller_identity.current.account_id
          "AWS:SourceArn"     = "arn:aws:ses:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:configuration-set/${aws_ses_configuration_set.announcements.name}"
        }
      }
    }]
  })
}

resource "aws_ses_event_destination" "announcement_feedback" {
  name                   = "announcement-feedback"
  configuration_set_name = aws_ses_configuration_set.announcements.name
  enabled                = true
  matching_types         = ["delivery", "bounce", "complaint"]

  sns_destination {
    topic_arn = aws_sns_topic.announcement_feedback.arn
  }

  depends_on = [aws_sns_topic_policy.announcement_feedback]
}

data "archive_file" "announcement_feedback" {
  type             = "zip"
  source_file      = "${path.module}/../../backend/announcement-feedback/lambda_function.py"
  output_path      = "${path.module}/build/announcement-feedback.zip"
  output_file_mode = "0644"
}

resource "aws_iam_role" "announcement_feedback" {
  name = "${var.name_prefix}-announcement-feedback-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "announcement_feedback_logs" {
  role       = aws_iam_role.announcement_feedback.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "announcement_feedback" {
  name = "announcement-feedback"
  role = aws_iam_role.announcement_feedback.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      # Mark the person's row (only an announcement's: the write checks kind).
      Effect   = "Allow"
      Action   = "dynamodb:UpdateItem"
      Resource = aws_dynamodb_table.recipients.arn
    }]
  })
}

resource "aws_lambda_function" "announcement_feedback" {
  function_name    = "${var.name_prefix}-announcement-feedback"
  role             = aws_iam_role.announcement_feedback.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.announcement_feedback.output_path
  source_code_hash = data.archive_file.announcement_feedback.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      RECIPIENTS_TABLE = aws_dynamodb_table.recipients.name
    }
  }
}

resource "aws_sns_topic_subscription" "announcement_feedback" {
  topic_arn = aws_sns_topic.announcement_feedback.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.announcement_feedback.arn
}

resource "aws_lambda_permission" "announcement_feedback_sns" {
  statement_id  = "AllowSnsInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.announcement_feedback.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.announcement_feedback.arn
}
