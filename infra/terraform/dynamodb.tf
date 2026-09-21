# Existing POC tables (imported). All PAY_PER_REQUEST, AWS-owned-key SSE,
# PITR/TTL disabled, no deletion protection — matching live state as of import.

resource "aws_dynamodb_table" "campaigns" {
  name         = "${var.name_prefix}-campaigns"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "campaignId"

  attribute {
    name = "campaignId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # Campaigns hub filters by status; the approvals queue reads PENDING_APPROVAL.
  # Without this both would need a full table scan.
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "recipients" {
  name         = "${var.name_prefix}-recipients"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "campaignId"
  range_key    = "recipientId"

  attribute {
    name = "campaignId"
    type = "S"
  }

  attribute {
    name = "recipientId"
    type = "S"
  }

  attribute {
    name = "trackingToken"
    type = "S"
  }

  global_secondary_index {
    name            = "trackingToken-index"
    hash_key        = "trackingToken"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "events" {
  name         = "${var.name_prefix}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "campaignId"
  range_key    = "eventId"

  attribute {
    name = "campaignId"
    type = "S"
  }

  attribute {
    name = "eventId"
    type = "S"
  }
}
