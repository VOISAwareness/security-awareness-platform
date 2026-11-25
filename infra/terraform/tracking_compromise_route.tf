# Stage 2 of a simulation: the browser page.
#
# A scenario can carry a second page (browserPageHtml), a fake sign-in or code
# screen. The email link to it (GET /track/{trackingToken}?next=browser, the
# hand-made tracking route) records the click and serves that page as HTML from
# this API's own domain. Submitting it posts here; the tracking Lambda marks the
# recipient compromised (compromisedAt) and shows the campaign's landing page.
#
# The Lambda never reads the request body, and the page's fields carry no
# names, so nothing typed into the page is ever sent or stored (AGENTS.md
# rule 5). Its CSP allows form-action 'self' only on this page.
#
# The tracking function itself stays click-ops (looked up in
# tracking_landing_page.tf); only this route, its integration and the
# permission are declared. Its role already writes the events table and
# updates the recipients table for clicks, which is all a compromise needs.

resource "aws_lambda_permission" "tracking_tf_routes" {
  statement_id  = "AllowAPIGatewayInvokeTrackingCompromise"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.tracking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/POST/track/*"
}

resource "aws_apigatewayv2_integration" "tracking" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = data.aws_lambda_function.tracking.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "tracking_compromise" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /track/{trackingToken}/compromise"
  target    = "integrations/${aws_apigatewayv2_integration.tracking.id}"
}
