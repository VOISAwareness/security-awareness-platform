# The role the "Terraform" GitHub Actions workflow (.github/workflows/terraform.yml)
# runs as, so plan/apply can be run from GitHub instead of a laptop or Codespace.
#
# Bootstrap: a person applies this file once (Codespace or CloudShell); after
# that the workflow works. Changes to this file are always applied by a person:
# the role's name is outside the ${var.name_prefix}-* pattern its IAM rights
# cover, so the workflow can read this role but never widen its own access.
#
# Guard rails, on top of the workflow's "no destroy unless ticked" check:
# - only workflow runs on main can assume it (not branches, not pull requests);
# - every right is scoped to this project's resources;
# - the bucket, the tables and the API itself can never be deleted by it.

locals {
  github_repository = "VOISAwareness/security-awareness-platform"
  account_id        = data.aws_caller_identity.current.account_id
  region            = data.aws_region.current.region
  project_roles     = "arn:aws:iam::${local.account_id}:role/${var.name_prefix}-*"
  project_tables    = "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.name_prefix}-*"
  project_functions = "arn:aws:lambda:${local.region}:${local.account_id}:function:${var.name_prefix}-*"
  api_arn           = "arn:aws:apigateway:${local.region}::/apis/${aws_apigatewayv2_api.main.id}"
}

resource "aws_iam_role" "github_terraform" {
  name                 = "GitHubActionsTerraformRole"
  description          = "Terraform plan/apply from the GitHub Actions workflow on main"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      # The GitHub OIDC provider already exists (it backs the Lambda deploy role).
      Principal = {
        Federated = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:${local.github_repository}:ref:refs/heads/main",
            # The same claim when the org's OIDC subject carries owner/repo IDs.
            "repo:VOISAwareness@*/security-awareness-platform@*:ref:refs/heads/main",
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_terraform" {
  name = "terraform-project-resources"
  role = aws_iam_role.github_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "StateFile"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.assets.arn}/terraform/state/*"
      },
      {
        Sid    = "AssetsBucketSettings"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucket*",
          "s3:GetAccelerateConfiguration",
          "s3:GetEncryptionConfiguration",
          "s3:GetLifecycleConfiguration",
          "s3:GetReplicationConfiguration",
          "s3:PutBucketCORS",
          "s3:PutBucketTagging",
          "s3:PutEncryptionConfiguration",
        ]
        Resource = aws_s3_bucket.assets.arn
      },
      {
        Sid    = "Tables"
        Effect = "Allow"
        Action = [
          "dynamodb:Describe*",
          "dynamodb:ListTagsOfResource",
          "dynamodb:GetResourcePolicy",
          "dynamodb:CreateTable",
          "dynamodb:UpdateTable",
          "dynamodb:UpdateTimeToLive",
          "dynamodb:UpdateContinuousBackups",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
        ]
        Resource = [local.project_tables, "${local.project_tables}/index/*"]
      },
      {
        Sid    = "Functions"
        Effect = "Allow"
        Action = [
          "lambda:Get*",
          "lambda:List*",
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:DeleteFunction",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:TagResource",
          "lambda:UntagResource",
        ]
        Resource = local.project_functions
      },
      {
        Sid    = "FunctionRoles"
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole",
          "iam:ListRoleTags",
          "iam:CreateRole",
          "iam:UpdateRole",
          "iam:UpdateRoleDescription",
          "iam:UpdateAssumeRolePolicy",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
        ]
        Resource = local.project_roles
      },
      {
        # Only the AWS logging policy may be attached, never e.g. AdministratorAccess.
        Sid       = "FunctionRolesLoggingOnly"
        Effect    = "Allow"
        Action    = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
        Resource  = local.project_roles
        Condition = { ArnEquals = { "iam:PolicyARN" = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" } }
      },
      {
        Sid       = "PassRolesToLambdaOnly"
        Effect    = "Allow"
        Action    = "iam:PassRole"
        Resource  = local.project_roles
        Condition = { StringEquals = { "iam:PassedToService" = "lambda.amazonaws.com" } }
      },
      {
        # Read itself so plans can refresh this file; never write itself.
        Sid      = "ReadOwnRole"
        Effect   = "Allow"
        Action   = ["iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:ListRoleTags"]
        Resource = aws_iam_role.github_terraform.arn
      },
      {
        Sid      = "Api"
        Effect   = "Allow"
        Action   = ["apigateway:GET", "apigateway:POST", "apigateway:PUT", "apigateway:PATCH", "apigateway:DELETE"]
        Resource = ["${local.api_arn}/*", "arn:aws:apigateway:${local.region}::/tags/*"]
      },
      {
        Sid      = "ApiItself"
        Effect   = "Allow"
        Action   = ["apigateway:GET", "apigateway:PATCH", "apigateway:PUT"]
        Resource = local.api_arn
      },
      {
        # Data can only be destroyed by a person, whatever the plan says.
        Sid    = "NeverDeleteData"
        Effect = "Deny"
        Action = ["s3:DeleteBucket", "dynamodb:DeleteTable", "apigateway:DELETE"]
        Resource = [
          aws_s3_bucket.assets.arn,
          local.project_tables,
          local.api_arn,
        ]
      },
    ]
  })
}

output "github_terraform_role_arn" {
  description = "Role the Terraform GitHub Actions workflow assumes"
  value       = aws_iam_role.github_terraform.arn
}
