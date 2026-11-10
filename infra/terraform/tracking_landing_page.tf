# tracking was created by hand (click-ops); its role is looked up, not managed.
# Terraform only attaches this one inline policy: it reads the clicked
# campaign and its landing page, so the phishing link opens the landing page
# chosen in the wizard, and assigns the campaign's training path.

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
    Statement = [
      {
        Effect   = "Allow"
        Action   = "dynamodb:GetItem"
        Resource = [aws_dynamodb_table.campaigns.arn, aws_dynamodb_table.landing_pages.arn]
      },
      {
        # A click assigns the campaign's training path: the person's existing
        # assignments, their department from the users table, then one new row.
        Effect   = "Allow"
        Action   = ["dynamodb:Query", "dynamodb:PutItem"]
        Resource = [aws_dynamodb_table.training_assignments.arn]
      },
      {
        Effect   = "Allow"
        Action   = "dynamodb:Query"
        Resource = ["${aws_dynamodb_table.users.arn}/index/email-index"]
      },
    ]
  })
}
