# Reference-data tables backing the frontend's dummy data.
# Field names are preserved EXACTLY as the frontend JSON uses them (so the
# existing UI keeps working); only key attributes are declared here.
# All PAY_PER_REQUEST (free-tier friendly), same prefix as the POC tables.

# users  (MasterUserData.json) — PK UserID; GSI on email for lookups/joins.
resource "aws_dynamodb_table" "users" {
  name         = "${var.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserID"

  attribute {
    name = "UserID"
    type = "S"
  }
  attribute {
    name = "UserEMailID"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "UserEMailID"
    projection_type = "ALL"
  }
}

# sender-identities (EmailIDsAndDomains.json) — PK id; GSI on email
# (scenarios/campaigns reference the sender by the email string).
resource "aws_dynamodb_table" "sender_identities" {
  name         = "${var.name_prefix}-sender-identities"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }
}

# scenarios (ScenariosData.json) — PK scenarioId.
resource "aws_dynamodb_table" "scenarios" {
  name         = "${var.name_prefix}-scenarios"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scenarioId"

  attribute {
    name = "scenarioId"
    type = "S"
  }
}

# landing-pages (LandingPageCatalogues.json) — PK LandingPageID.
resource "aws_dynamodb_table" "landing_pages" {
  name         = "${var.name_prefix}-landing-pages"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LandingPageID"

  attribute {
    name = "LandingPageID"
    type = "S"
  }
}

# user-lists (UserDLsData.json metadata) — PK userListId (synthesized on seed
# from id/dlId; a listType attribute distinguishes SAVED vs SYNCED).
resource "aws_dynamodb_table" "user_lists" {
  name         = "${var.name_prefix}-user-lists"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userListId"

  attribute {
    name = "userListId"
    type = "S"
  }
}

# user-list-members (UserDLsData.json users[]/members[]) — PK userListId, SK email.
resource "aws_dynamodb_table" "user_list_members" {
  name         = "${var.name_prefix}-user-list-members"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userListId"
  range_key    = "email"

  attribute {
    name = "userListId"
    type = "S"
  }
  attribute {
    name = "email"
    type = "S"
  }
}

# gamification-rules (GamificationData.json) — PK EventOperation.
resource "aws_dynamodb_table" "gamification_rules" {
  name         = "${var.name_prefix}-gamification-rules"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "EventOperation"

  attribute {
    name = "EventOperation"
    type = "S"
  }
}

# --- Training catalogue (TrainingPath/Videos/Quiz/Certificate.json) ---
# Field names preserved exactly (incl. "Thumbnail(CoverImage)"), list-all +
# PK lookups only, so no GSIs.

resource "aws_dynamodb_table" "training_paths" {
  name         = "${var.name_prefix}-training-paths"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "TrainingPathID"
  attribute {
    name = "TrainingPathID"
    type = "S"
  }
}

resource "aws_dynamodb_table" "training_videos" {
  name         = "${var.name_prefix}-training-videos"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "TrainingVideoID"
  attribute {
    name = "TrainingVideoID"
    type = "S"
  }
}

resource "aws_dynamodb_table" "training_quizzes" {
  name         = "${var.name_prefix}-training-quizzes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "TrainingQuizID"
  attribute {
    name = "TrainingQuizID"
    type = "S"
  }
}

resource "aws_dynamodb_table" "training_certificates" {
  name         = "${var.name_prefix}-training-certificates"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "TrainingCertificateID"
  attribute {
    name = "TrainingCertificateID"
    type = "S"
  }
}

# --- Campaigns catalogue (CampaignsData.json) — dummy history for the hub. ---
# Separate from the live "campaigns" table that backs the wizard/approval spine.
resource "aws_dynamodb_table" "campaigns_catalog" {
  name         = "${var.name_prefix}-campaigns-catalog"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "campaignId"

  attribute {
    name = "campaignId"
    type = "S"
  }
  attribute {
    name = "campaignStatus"
    type = "S"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "campaignStatus"
    range_key       = "campaignId"
    projection_type = "ALL"
  }
}
