# The email-sender Lambda predates Terraform (click-ops); its code ships
# through deploy-lambda.yml and its SES config lives in click-ops env vars.
# Only its new trigger route is declared here, so the API is no longer changed
# by hand. The function is looked up rather than managed, so Terraform never
# touches its code or settings.
#
# Safety: the Lambda sends only to its SES_RECIPIENT_EMAIL env var, never to a
# campaign's real audience. In the SES sandbox that recipient must be a
# verified identity, which keeps non-prod sends off real employees.

data "aws_lambda_function" "email_sender" {
  function_name = "${var.name_prefix}-email-sender"
}

resource "aws_lambda_permission" "email_sender_tf_routes" {
  statement_id  = "AllowAPIGatewayInvokeEmailSender"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.email_sender.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "email_sender" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = data.aws_lambda_function.email_sender.invoke_arn
  payload_format_version = "2.0"
}

# Trigger a send for an APPROVED campaign. The Lambda itself performs the
# APPROVED -> SENDING -> SENT transition with a conditional write.
resource "aws_apigatewayv2_route" "campaign_send" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /campaigns/{campaignId}/send"
  target    = "integrations/${aws_apigatewayv2_integration.email_sender.id}"
}
