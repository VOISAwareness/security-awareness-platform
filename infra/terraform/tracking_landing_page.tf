# tracking was created by hand (click-ops); its role is looked up, not managed.
# Terraform only attaches this one inline policy: it reads the clicked
# campaign and its landing page, so the phishing link opens the landing page
# chosen in the wizard.

data "aws_lambda_function" "tracking" {
  function_name = "${var.name_prefix}-tracking"
}

locals {
  # role ARNs end in the role's name (after any path)
  tracking_role_name = regex("[^/]+$", data.aws_lambda_function.tracking.role)
}

resource "aws_iam_role_policy" "tracking_landing_page" {
  name = "tracking-read-campaign-landing-page"
  role = local.tracking_role_name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "dynamodb:GetItem"
      Resource = [aws_dynamodb_table.campaigns.arn, aws_dynamodb_table.landing_pages.arn]
    }]
  })
}
