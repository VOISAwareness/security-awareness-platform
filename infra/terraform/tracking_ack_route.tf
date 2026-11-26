# The "I've read this" button in an announcement email opens
# GET /ack/{trackingToken} on the tracking Lambda (click-ops; looked up in
# tracking_landing_page.tf, integration in tracking_compromise_route.tf). It
# records that the person read it, once, and shows a thank-you page. A token
# works only on its own kind of route: an announcement's is never a phishing
# click, and a phishing token never acknowledges. The tracking role already
# reads recipients by token, updates them and writes events (for clicks).

resource "aws_lambda_permission" "tracking_ack" {
  statement_id  = "AllowAPIGatewayInvokeTrackingAck"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.tracking.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/GET/ack/*"
}

resource "aws_apigatewayv2_route" "tracking_ack" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /ack/{trackingToken}"
  target    = "integrations/${aws_apigatewayv2_integration.tracking.id}"
}
