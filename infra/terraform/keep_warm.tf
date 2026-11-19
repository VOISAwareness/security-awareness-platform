# Keep the API Lambdas started. A Lambda that has had no request for a while
# is shut down, and the next request waits for a fresh one to start (Python,
# boto3, the module's setup): the first page someone opens after a quiet
# spell feels slow. A ping every five minutes keeps one copy of each API
# Lambda started, which also keeps insights-api's built Insights in memory.
# The handlers answer the ping ({"warm": true}, no routeKey) at once, without
# touching DynamoDB. About 9,000 tiny runs a month per Lambda: inside the free
# tier. (Provisioned concurrency would keep them started for sure, but is
# billed by the hour.)

locals {
  keep_warm = {
    reference-api = aws_lambda_function.reference_api
    campaigns-api = aws_lambda_function.campaigns_api
    insights-api  = aws_lambda_function.insights_api
  }
}

resource "aws_cloudwatch_event_rule" "keep_warm" {
  name                = "${var.name_prefix}-keep-warm"
  description         = "Keeps the API Lambdas started (a warm ping every 5 minutes)"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "keep_warm" {
  for_each  = local.keep_warm
  rule      = aws_cloudwatch_event_rule.keep_warm.name
  target_id = each.key
  arn       = each.value.arn
  input     = jsonencode({ warm = true })
}

resource "aws_lambda_permission" "keep_warm" {
  for_each      = local.keep_warm
  statement_id  = "AllowKeepWarmSchedule"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.keep_warm.arn
}
