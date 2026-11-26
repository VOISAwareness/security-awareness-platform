# announcement-sender: emails an approved announcement roll-out to its people
# through SES, at its start (campaign-scheduler invokes it). See
# backend/announcement-sender/lambda_function.py. Code is packaged here, as
# for campaign-scheduler.
#
# Safety: nothing is sent while var.announcement_sending_enabled is false
# (the default). Outside production set var.announcement_allowed_domains so
# only those domains are ever handed to SES; in the SES sandbox only verified
# addresses receive anything at all.

data "archive_file" "announcement_sender" {
  type             = "zip"
  source_file      = "${path.module}/../../backend/announcement-sender/lambda_function.py"
  output_path      = "${path.module}/build/announcement-sender.zip"
  output_file_mode = "0644"
}

resource "aws_iam_role" "announcement_sender" {
  name = "${var.name_prefix}-announcement-sender-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "announcement_sender_logs" {
  role       = aws_iam_role.announcement_sender.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "announcement_sender" {
  name = "announcement-sender"
  role = aws_iam_role.announcement_sender.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Read the roll-out; move it APPROVED -> SENDING -> SENT/FAILED.
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.announcements.arn
      },
      {
        # One row per person (campaignId = the roll-out's id); a resumed run
        # reads which people already have one.
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"]
        Resource = aws_dynamodb_table.recipients.arn
      },
      {
        # The roll-out's recipient list.
        Effect   = "Allow"
        Action   = "dynamodb:Query"
        Resource = aws_dynamodb_table.user_list_members.arn
      },
      {
        # Send, and check that the chosen sender is verified.
        Effect    = "Allow"
        Action    = ["ses:SendEmail", "ses:GetIdentityVerificationAttributes"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:RequestedRegion" = data.aws_region.current.region } }
      },
    ]
  })
}

# Carry a long send on in a new run of itself (kept apart from the policy
# above so the role does not depend on the function).
resource "aws_iam_role_policy" "announcement_sender_resume" {
  name = "announcement-sender-resume"
  role = aws_iam_role.announcement_sender.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = aws_lambda_function.announcement_sender.arn
    }]
  })
}

resource "aws_lambda_function" "announcement_sender" {
  function_name    = "${var.name_prefix}-announcement-sender"
  role             = aws_iam_role.announcement_sender.arn
  runtime          = "python3.12"
  architectures    = ["arm64"]
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.announcement_sender.output_path
  source_code_hash = data.archive_file.announcement_sender.output_base64sha256
  timeout          = 900 # a long list carries on in a new run before this
  memory_size      = 256

  environment {
    variables = {
      ANNOUNCEMENTS_TABLE          = aws_dynamodb_table.announcements.name
      RECIPIENTS_TABLE             = aws_dynamodb_table.recipients.name
      USER_LIST_MEMBERS_TABLE      = aws_dynamodb_table.user_list_members.name
      SES_REGION                   = data.aws_region.current.region
      ANNOUNCEMENT_SENDING_ENABLED = tostring(var.announcement_sending_enabled)
      ANNOUNCEMENT_SENDER_EMAIL    = var.announcement_sender_email
      ANNOUNCEMENT_TEST_RECIPIENT  = var.announcement_test_recipient
      ANNOUNCEMENT_ALLOWED_DOMAINS = var.announcement_allowed_domains
      ANNOUNCEMENT_MAX_PER_SECOND  = tostring(var.announcement_max_per_second)
    }
  }
}
