# Tables added by docs/database-schema.md, so every screen can read backend
# data. All on-demand: they are written in bursts (a seed run, a campaign
# going out) that the free provisioned units cannot absorb, and at this
# project's size on-demand costs a few cents a month.

# training-assignments — one row per person per training path: who has it,
# why (given after a click, or taken by choice), and how it went. PK owner
# (their email), SK assignmentId ("A#<assignedAt>#<TrainingPathID>").
resource "aws_dynamodb_table" "training_assignments" {
  name         = "${var.name_prefix}-training-assignments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "owner"
  range_key    = "assignmentId"

  attribute {
    name = "owner"
    type = "S"
  }
  attribute {
    name = "assignmentId"
    type = "S"
  }
  attribute {
    name = "TrainingPathID"
    type = "S"
  }
  attribute {
    name = "assignedAt"
    type = "S"
  }

  # Everyone on one programme, newest first (the training report).
  global_secondary_index {
    name            = "path-assignedAt-index"
    hash_key        = "TrainingPathID"
    range_key       = "assignedAt"
    projection_type = "ALL"
  }
}

# announcements — announcement templates and each sending of one (kind
# TEMPLATE | ROLLOUT). A roll-out's people and events go in recipients and
# events under its id, so it needs no tables of its own.
resource "aws_dynamodb_table" "announcements" {
  name         = "${var.name_prefix}-announcements"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "announcementId"

  attribute {
    name = "announcementId"
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

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
}

# stats-daily — small running totals per day, so Insights, Home and the Big
# Picture never scan events. PK scope ("COMPANY", "DEPT#<name>",
# "TYPE#<type>", "DEPT#<name>#TYPE#<type>", "COUNTRY#<name>"), SK day
# ("2026-11-10").
resource "aws_dynamodb_table" "stats_daily" {
  name         = "${var.name_prefix}-stats-daily"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scope"
  range_key    = "day"

  attribute {
    name = "scope"
    type = "S"
  }
  attribute {
    name = "day"
    type = "S"
  }
}

# people-snapshots — each person's risk tier, score and level as they stood
# on a day (the first of each month, and the latest). PK snapshotDay, SK
# owner (their email): one query gives everyone on that day.
resource "aws_dynamodb_table" "people_snapshots" {
  name         = "${var.name_prefix}-people-snapshots"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "snapshotDay"
  range_key    = "owner"

  attribute {
    name = "snapshotDay"
    type = "S"
  }
  attribute {
    name = "owner"
    type = "S"
  }
}
