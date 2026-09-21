# Declarative imports of the pre-existing click-ops resources into Terraform.
# Safe to leave in place after apply; remove once state is settled if preferred.

import {
  to = aws_dynamodb_table.campaigns
  id = "security-awareness-poc-campaigns"
}

import {
  to = aws_dynamodb_table.recipients
  id = "security-awareness-poc-recipients"
}

import {
  to = aws_dynamodb_table.events
  id = "security-awareness-poc-events"
}

import {
  to = aws_s3_bucket.assets
  id = "security-awareness-poc-satyajit-2026"
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.assets
  id = "security-awareness-poc-satyajit-2026"
}

import {
  to = aws_apigatewayv2_api.main
  id = "1ldu4adn0l"
}
