# Allow the browser to PUT uploads (recipient lists, covers, training media,
# packages) directly to S3 through the presigned URL the API hands out, from
# the frontend origin(s). The signed URL is what authorizes a PUT; CORS only
# lets the page see the answer.
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = concat(var.cors_allowed_origins, var.upload_allowed_origins)
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 300
  }
}
