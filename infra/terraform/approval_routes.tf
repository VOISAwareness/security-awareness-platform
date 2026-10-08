# The approval Lambda and its submit/approve/reject routes predate Terraform
# (click-ops); its code ships through deploy-lambda.yml. New workflow routes are
# declared here so the API is not changed by hand again. The function is looked
# up rather than managed, so Terraform never touches its code or settings.

data "aws_lambda_function" "approval" {
  function_name = "${var.name_prefix}-approval"
}

resource "aws_lambda_permission" "approval_tf_routes" {
  statement_id  = "AllowAPIGatewayInvokeTerraformRoutes"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.approval.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "approval" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = data.aws_lambda_function.approval.invoke_arn
  payload_format_version = "2.0"
}

# A creator pulls a pending request back to DRAFT, e.g. to reschedule one whose
# start time passed before anyone approved it.
resource "aws_apigatewayv2_route" "campaign_withdraw" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /campaigns/{campaignId}/withdraw"
  target    = "integrations/${aws_apigatewayv2_integration.approval.id}"
}
