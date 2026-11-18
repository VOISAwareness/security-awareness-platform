# Training packages, unpacked by package-extract into training-content/, served
# through CloudFront at /scorm/<uploadId>/<file>.
#
# Why: a course is a web page that loads hundreds of files and talks to the
# app (the SCORM API) through window.parent, which only works when the course
# is on the app's own origin. The app reaches these files at /scorm/... on its
# own host: in development the Vite dev server forwards /scorm to this
# distribution; when the app itself is hosted, this distribution (or the one
# hosting it) serves /scorm/* beside it.
#
# - The bucket stays private: CloudFront reads it with an origin access
#   control, and the bucket policy lets only this distribution read, and only
#   training-content/*.
# - A viewer-request function maps /scorm/<32 hex>/<path> to
#   training-content/<32 hex>/<path> and answers 404 to anything else, so no
#   other key in the bucket can be asked for. The 32-hex folder is the upload
#   id, which cannot be guessed; there is no per-user check on these files yet.
# - Cached at the edge (the files of a package never change: a new upload
#   gets a new folder), so a course loads fast and S3 is read once per file.
# - Inside CloudFront's always-free tier (1 TB out, 10M requests, 2M function
#   runs a month) at this project's scale.

locals {
  # AWS-managed policies (the same ids in every account).
  cache_policy_caching_optimized   = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  response_headers_security_policy = "67f7725c-6f97-4210-82d7-5512b31e9d03"
  scorm_origin_id                  = "training-content"
}

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${var.name_prefix}-assets"
  description                       = "CloudFront reads training-content/ from the private assets bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "scorm_path" {
  name    = "${var.name_prefix}-scorm-path"
  runtime = "cloudfront-js-2.0"
  comment = "/scorm/<uploadId>/<path> -> training-content/<uploadId>/<path>; 404 otherwise"
  publish = true
  code    = file("${path.module}/functions/scorm_path.js")
}

resource "aws_cloudfront_distribution" "scorm" {
  enabled         = true
  comment         = "${var.name_prefix} training packages (/scorm/*)"
  price_class     = "PriceClass_200" # includes India
  http_version    = "http2and3"
  is_ipv6_enabled = true

  origin {
    origin_id                = local.scorm_origin_id
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  # Every path goes through the function: /scorm/... is served, the rest is 404.
  default_cache_behavior {
    target_origin_id           = local.scorm_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.cache_policy_caching_optimized
    response_headers_policy_id = local.response_headers_security_policy

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.scorm_path.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# The assets bucket had no bucket policy (access is by IAM roles and presigned
# links); this adds the one statement CloudFront needs.
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "CloudFrontReadsTrainingContent"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/training-content/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.scorm.arn } }
    }]
  })
}

output "scorm_content_domain" {
  description = "CloudFront host serving /scorm/* (the Vite dev server forwards /scorm here)"
  value       = aws_cloudfront_distribution.scorm.domain_name
}
