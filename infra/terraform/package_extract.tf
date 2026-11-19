# package-extract: unpacks a training package's zip once, when it is saved,
# into training-content/<uploadId>/ in the assets bucket, and records on the
# package's row what to open (LaunchPath) and its SCORM version. reference-api
# starts it (asynchronously) after POST /training/packages; nothing else calls
# it. It has no API route. Lambda retries an asynchronous invoke that errors
# (twice, its default); unpacking a package again is safe, and a zip that
# cannot be played is marked FAILED without an error, so it is not retried.

data "archive_file" "package_extract" {
  type             = "zip"
  source_file      = "${path.module}/../../backend/package-extract/lambda_function.py"
  output_path      = "${path.module}/build/package-extract.zip"
  output_file_mode = "0644"
}

resource "aws_iam_role" "package_extract" {
  name = "${var.name_prefix}-package-extract-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "package_extract_logs" {
  role       = aws_iam_role.package_extract.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "package_extract" {
  name = "package-extract"
  role = aws_iam_role.package_extract.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # read the uploaded zips; never write or delete them
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.assets.arn}/uploads/training-packages/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.assets.arn}/training-content/*"
      },
      {
        Effect    = "Allow"
        Action    = ["s3:ListBucket"]
        Resource  = aws_s3_bucket.assets.arn
        Condition = { StringLike = { "s3:prefix" = ["training-content/*"] } }
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.training_packages.arn
      },
    ]
  })
}

resource "aws_lambda_function" "package_extract" {
  function_name    = "${var.name_prefix}-package-extract"
  role             = aws_iam_role.package_extract.arn
  runtime          = "python3.12"
  architectures    = ["arm64"] # Graviton: pure Python, 20% cheaper per ms
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.package_extract.output_path
  source_code_hash = data.archive_file.package_extract.output_base64sha256

  # A 250 MB zip (the API's cap) of a few thousand files unpacks in about a
  # minute; memory buys network and CPU. The zip is downloaded to /tmp first.
  timeout     = 600
  memory_size = 1024
  ephemeral_storage {
    size = 1024
  }

  environment {
    variables = {
      TABLE_PREFIX  = var.name_prefix
      UPLOAD_BUCKET = aws_s3_bucket.assets.bucket
    }
  }
}
