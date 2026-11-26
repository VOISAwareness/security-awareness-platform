variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "poc"
}

variable "name_prefix" {
  description = "Prefix for existing POC resources"
  type        = string
  default     = "security-awareness-poc"
}

variable "cors_allowed_origins" {
  description = "Origins allowed to call the HTTP API from a browser"
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:5174"]
}

# S3 CORS takes one wildcard per origin (the HTTP API's CORS does not), so
# dev servers in GitHub Codespaces can upload straight to S3: the Codespaces
# port forwarding refuses large request bodies, so routing them through the
# dev server failed for big files (413).
variable "upload_allowed_origins" {
  description = "Extra origins allowed to PUT presigned uploads to the assets bucket"
  type        = list(string)
  default     = ["https://*.app.github.dev"]
}

# ---------------------------------------------------------- announcement sending
# announcement-sender (announcement_sender.tf). Off until announcement emails
# are wanted; while off, campaign-scheduler leaves due roll-outs APPROVED.
variable "announcement_sending_enabled" {
  description = "Send approved announcement roll-outs by email at their start (SES)"
  type        = bool
  default     = false
}

variable "announcement_sender_email" {
  description = "From address when a roll-out's chosen sender is not verified in SES (blank: such roll-outs fail, unsent)"
  type        = string
  default     = ""
}

variable "announcement_test_recipient" {
  description = "Where a test announcement goes when it names no one (a verified address)"
  type        = string
  default     = ""
}

variable "announcement_allowed_domains" {
  description = "Comma-separated email domains announcements may go to (blank: any). Set it outside production."
  type        = string
  default     = ""
}

variable "announcement_max_per_second" {
  description = "Announcement emails per second: SES's rate (1 in the sandbox)"
  type        = number
  default     = 1
}
