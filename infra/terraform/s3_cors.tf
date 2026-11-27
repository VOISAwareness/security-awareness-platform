# Allow the browser to PUT uploads (recipient lists, covers, training media,
# packages) directly to S3 through the presigned URL the API hands out, from
# the frontend origin(s): local development, Codespaces, and the hosted app
# (app_hosting.tf). The signed URL is what authorizes a PUT; CORS only
# lets the page see the answer.
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    # POST: pictures for emails and browser pages go up as a presigned form,
    # which can limit their size (POST /media/images/upload).
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = concat(var.cors_allowed_origins, var.upload_allowed_origins, ["https://${aws_cloudfront_distribution.scorm.domain_name}"])
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 300
  }
}
