# Keep the API Lambdas started. A Lambda that has had no request for a while
# is shut down, and the next request waits for a fresh one to start (Python,
# boto3, the module's setup): the first page someone opens after a quiet
# spell feels slow. A ping every five minutes keeps one copy of each API
# Lambda started, which also keeps insights-api's built Insights in memory.
# The handlers answer the ping ({"warm": true}, no routeKey) at once, without
# touching DynamoDB. About 9,000 tiny runs a month per Lambda: inside the free
# tier. (Provisioned concurrency would keep them started for sure, but is
# billed by the hour.)
#
# One started copy answers one request at a time: when a page asks
# reference-api or campaigns-api for several things at once, the others waited
# for more copies to start (about half a second each). So those two are pinged
# twice at once, each ping asking its copy to stay busy for holdMs: while one
# copy is held, the other ping starts a second one, and two stay started.
# Both pings are targets of the one rule, so they arrive together (a rule
# takes at most five targets). insights-api keeps one copy: its built Insights
# live in that copy's memory, and a second copy would have to build them
# again. About 35,000 extra 0.3 s runs a month: inside the free tier.

locals {
  keep_warm = {
    reference-api = aws_lambda_function.reference_api
    campaigns-api = aws_lambda_function.campaigns_api
    insights-api  = aws_lambda_function.insights_api
  }
  # the Lambdas kept at two started copies, and how long each ping holds one
  keep_warm_second_copy = {
    reference-api = aws_lambda_function.reference_api
    campaigns-api = aws_lambda_function.campaigns_api
  }
  keep_warm_hold_ms = 300
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
  input = (contains(keys(local.keep_warm_second_copy), each.key)
    ? jsonencode({ warm = true, holdMs = local.keep_warm_hold_ms })
  : jsonencode({ warm = true }))
}

# The second ping of a Lambda kept at two copies (the permissions below
# already allow this rule to invoke it).
resource "aws_cloudwatch_event_target" "keep_warm_second_copy" {
  for_each  = local.keep_warm_second_copy
  rule      = aws_cloudwatch_event_rule.keep_warm.name
  target_id = "${each.key}-2"
  arn       = each.value.arn
  input     = jsonencode({ warm = true, holdMs = local.keep_warm_hold_ms })
}

resource "aws_lambda_permission" "keep_warm" {
  for_each      = local.keep_warm
  statement_id  = "AllowKeepWarmSchedule"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.keep_warm.arn
}
