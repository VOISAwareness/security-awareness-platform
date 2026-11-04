# email-sender was created by hand (click-ops); its role is looked up, not
# managed. Terraform only attaches this one inline policy: it reads a sender's
# SES verification state, so a campaign sends from the address chosen in the
# wizard once SES has verified it (Email IDs & Domains asks SES to verify).

locals {
  # role ARNs end in the role's name (after any path)
  email_sender_role_name = regex("[^/]+$", data.aws_lambda_function.email_sender.role)
}

resource "aws_iam_role_policy" "email_sender_ses_status" {
  name = "email-sender-ses-verification-status"
  role = local.email_sender_role_name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "ses:GetIdentityVerificationAttributes"
      Resource  = "*"
      Condition = { StringEquals = { "aws:RequestedRegion" = data.aws_region.current.region } }
    }]
  })
}
