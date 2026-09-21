# recipient-ingest: S3-triggered Lambda that parses uploaded recipient CSVs into
# the user-list-members cache and marks the list READY. Terraform-managed.

data "archive_file" "recipient_ingest" {
  type        = "zip"
  source_file = "${path.module}/../../backend/recipient-ingest/lambda_function.py"
  output_path = "${path.module}/build/recipient-ingest.zip"
}

resource "aws_iam_role" "recipient_ingest" {
  name = "${var.name_prefix}-recipient-ingest-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "recipient_ingest_logs" {
  role       = aws_iam_role.recipient_ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "recipient_ingest" {
  name = "recipient-ingest"
  role = aws_iam_role.recipient_ingest.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.assets.arn}/uploads/recipients/*"
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:BatchWriteItem"]
        Resource = [
          aws_dynamodb_table.user_lists.arn,
          aws_dynamodb_table.user_list_members.arn,
        ]
      },
    ]
  })
}

resource "aws_lambda_function" "recipient_ingest" {
  function_name    = "${var.name_prefix}-recipient-ingest"
  role             = aws_iam_role.recipient_ingest.arn
  runtime          = "python3.12"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.recipient_ingest.output_path
  source_code_hash = data.archive_file.recipient_ingest.output_base64sha256
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      TABLE_PREFIX = var.name_prefix
    }
  }
}

