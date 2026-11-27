# The app itself, hosted on the CloudFront distribution in scorm_cdn.tf, beside
# the API (/api/*), training packages (/scorm/*) and pictures (/media/*).
#
# - The build lives in the assets bucket under app/ (private: CloudFront reads
#   it with the distribution's origin access control, bucket policy in
#   scorm_cdn.tf). .github/workflows/deploy-frontend.yml uploads it on every
#   merge to main that touches the frontend, as the frontend-deploy role
#   below, which can only add files under app/.
# - The app calls the API at /api on its own address, so CORS never applies,
#   and a course at /scorm/... is on the app's own origin, as it needs.
# - Until sign-in (Entra ID) exists, only the address ranges in the SSM
#   parameter below may open the app's pages: the default behaviour's
#   function (functions/site_path.js.tftpl) answers 403 to anyone else.
#   /api, /scorm and /media stay open: emails, tracking links and courses
#   need them. The distribution serves IPv4 only, so office and VPN ranges
#   match.
#
# The allowed ranges are kept out of git, in Parameter Store (free), so the
# terminal and the Terraform workflow read the same list. Set them once, then
# apply (a change to the list needs an apply too):
#
#   aws ssm put-parameter --profile vshield --overwrite --type String \
#     --name /security-awareness-poc/app-allowed-cidrs \
#     --value "203.0.113.0/24,198.51.100.7/32"
#
# A missing parameter, or anything in it that is not an IPv4 range, stops
# the plan, so the app is never opened to everyone by mistake.

data "aws_ssm_parameter" "app_allowed_cidrs" {
  name = "/${var.name_prefix}/app-allowed-cidrs"
}

locals {
  app_allowed_cidrs = [
    for c in split(",", data.aws_ssm_parameter.app_allowed_cidrs.insecure_value) : trimspace(c)
    if trimspace(c) != ""
  ]
  app_prefix = "app"
}

# Uploads the build (deploy-frontend.yml). It can list the bucket's app/
# folder and add or replace files there, nothing else: it cannot delete,
# read other folders, or touch CloudFront.
resource "aws_iam_role" "frontend_deploy" {
  name                 = "${var.name_prefix}-frontend-deploy"
  description          = "Uploads the frontend build to app/ in the assets bucket (GitHub Actions, main only)"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:${local.github_repository}:ref:refs/heads/main",
            "repo:VOISAwareness@*/security-awareness-platform@*:ref:refs/heads/main",
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "frontend_deploy" {
  name = "upload-app-build"
  role = aws_iam_role.frontend_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListAppFolder"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.assets.arn
        Condition = {
          StringLike = { "s3:prefix" = ["${local.app_prefix}/*", "${local.app_prefix}/"] }
        }
      },
      {
        Sid      = "UploadAppFiles"
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.assets.arn}/${local.app_prefix}/*"
      },
    ]
  })
}

output "app_url" {
  description = "The hosted app (open from the allowed address ranges only)"
  value       = "https://${aws_cloudfront_distribution.scorm.domain_name}/"
}

output "frontend_deploy_role_arn" {
  description = "Role deploy-frontend.yml assumes to upload the build"
  value       = aws_iam_role.frontend_deploy.arn
}
