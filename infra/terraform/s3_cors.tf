# Allow the browser to PUT uploaded recipient files directly to S3 via the
# presigned URL from the frontend origin(s).
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = var.cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 300
  }
}
