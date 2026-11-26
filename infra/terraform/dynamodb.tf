# Existing POC tables (imported). All PAY_PER_REQUEST, AWS-owned-key SSE,
# PITR disabled, no deletion protection — matching live state as of import.
# recipients and events have TTL on expiresAt for announcement rows (below).

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

  attribute {
    name = "recipientEmail"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "trackingToken-index"
    hash_key        = "trackingToken"
    projection_type = "ALL"
  }

  # The campaigns one person was in, newest first (My Space, the people
  # pop-up). Keys and outcome times only, never the tracking token.
  global_secondary_index {
    name               = "recipientEmail-index"
    hash_key           = "recipientEmail"
    range_key          = "createdAt"
    projection_type    = "INCLUDE"
    non_key_attributes = ["sendStatus", "department", "sentAt", "openedAt", "clickedAt", "compromisedAt", "reportedAt", "trainingAssignmentId"]
  }

  # Retention for announcement roll-outs: announcement-sender stamps each
  # person's row with the roll-out's expiresAt (a year after it ends) and
  # DynamoDB deletes it after that, at no cost. Phishing campaign rows carry
  # no expiresAt, so TTL never touches them.
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "events" {
  name         = "${var.name_prefix}-events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "campaignId"
  range_key    = "eventId"

  # New rows feed the points-engine Lambda (points_engine.tf). Turning the
  # stream on changes the table in place; reads by a Lambda trigger are free.
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  attribute {
    name = "campaignId"
    type = "S"
  }

  attribute {
    name = "eventId"
    type = "S"
  }

  # Retention for announcement roll-outs: an "I've read this" event carries
  # the roll-out's expiresAt and DynamoDB deletes it after that. Phishing
  # events carry none. Deletions reach the stream as REMOVE records, which
  # points-engine ignores (it scores INSERTs only).
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}
