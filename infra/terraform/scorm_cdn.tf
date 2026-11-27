# Training packages, unpacked by package-extract into training-content/, served
# through CloudFront at /scorm/<uploadId>/<file>.
#
# Why: a course is a web page that loads hundreds of files and talks to the
# app (the SCORM API) through window.parent, which only works when the course
# is on the app's own origin. The app reaches these files at /scorm/... on its
# own host: in development the Vite dev server forwards /scorm to this
# distribution; when the app itself is hosted, this distribution (or the one
# hosting it) serves /scorm/* beside it. The app itself is hosted here too
# (app_hosting.tf): every path that is not /api/*, /scorm/* or /media/*.
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
  cache_policy_caching_optimized             = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  response_headers_security_policy           = "67f7725c-6f97-4210-82d7-5512b31e9d03"
  origin_request_all_viewer_except_host_name = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  scorm_origin_id                            = "training-content"
  api_origin_id                              = "http-api"
}

# --- /api/*: the HTTP API, through the same distribution -------------------
#
# The app reads the API at /api/<route>. CloudFront passes every request on
# (any method, body, query string and header but Host) and keeps a GET answer
# only when the Lambda said it may: reference-api and insights-api send
# Cache-Control: s-maxage=N for reads every viewer shares (the training
# catalogue, people, levels, rules, Insights...) and no-store for everything
# else; a response with neither is not kept (default TTL 0). So a shared read
# costs one Lambda run per minute or five, not one per page view, and JSON is
# sent compressed. The cache key is the path, the whole query string and the
# Origin header (CORS answers differ by origin). A browser that has just
# written adds its own query parameter, so it never reads its own change
# from the shared copy.

resource "aws_cloudfront_function" "api_path" {
  name    = "${var.name_prefix}-api-path"
  runtime = "cloudfront-js-2.0"
  comment = "/api/<route> -> /<route> for the HTTP API"
  publish = true
  code    = file("${path.module}/functions/api_path.js")
}

resource "aws_cloudfront_cache_policy" "api" {
  name        = "${var.name_prefix}-api"
  comment     = "Keeps only what the API marks s-maxage; query string and Origin in the key"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 600

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
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
  comment = "/scorm -> training-content/, /media -> public-media/, else the app (allowed IPs) from app/"
  publish = true
  code = templatefile("${path.module}/functions/site_path.js.tftpl", {
    allowed_cidrs = jsonencode(local.app_allowed_cidrs)
  })

  lifecycle {
    precondition {
      condition = length(local.app_allowed_cidrs) > 0 && alltrue([
        for c in local.app_allowed_cidrs : can(regex("^[0-9]{1,3}(\\.[0-9]{1,3}){3}/[0-9]{1,2}$", c)) && can(cidrhost(c, 0))
      ])
      error_message = "SSM /${var.name_prefix}/app-allowed-cidrs must hold one or more IPv4 ranges, comma-separated (e.g. 203.0.113.0/24,198.51.100.7/32)."
    }
  }
}

resource "aws_cloudfront_distribution" "scorm" {
  enabled      = true
  comment      = "${var.name_prefix} app, training packages (/scorm/*), pictures (/media/*) and the API (/api/*)"
  price_class  = "PriceClass_200" # includes India
  http_version = "http2and3"
  # IPv4 only: the app's pages are open to allowed IPv4 ranges (app_hosting.tf),
  # and a viewer reaching it over IPv6 would never match them.
  is_ipv6_enabled = false

  origin {
    origin_id                = local.scorm_origin_id
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  origin {
    origin_id   = local.api_origin_id
    domain_name = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.api_origin_id
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id = local.origin_request_all_viewer_except_host_name

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_path.arn
    }
  }

  # Every other path goes through the function: /scorm/... and /media/... are
  # served to anyone; any other path is the app, for allowed addresses only
  # (functions/site_path.js.tftpl). The build's files are content-hashed and
  # uploaded with a year's Cache-Control; index.html with no-cache, so a new
  # release is picked up at once (deploy-frontend.yml).
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
    Statement = [
      {
        Sid       = "CloudFrontReadsTrainingContent"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.assets.arn}/training-content/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.scorm.arn } }
      },
      {
        # Pictures in emails and browser pages (POST /media/images/upload):
        # mail apps and browsers load them from /media/<id>/<name>.
        Sid       = "CloudFrontReadsPublicMedia"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.assets.arn}/public-media/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.scorm.arn } }
      },
      {
        # The app's build (app_hosting.tf).
        Sid       = "CloudFrontReadsApp"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.assets.arn}/${local.app_prefix}/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.scorm.arn } }
      },
    ]
  })
}

output "api_cdn_base_url" {
  description = "The API through CloudFront (the app's VITE_API_BASE_URL)"
  value       = "https://${aws_cloudfront_distribution.scorm.domain_name}/api"
}

output "scorm_content_domain" {
  description = "CloudFront host serving /scorm/* (the Vite dev server forwards /scorm here)"
  value       = aws_cloudfront_distribution.scorm.domain_name
}
