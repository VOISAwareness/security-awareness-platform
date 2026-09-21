# Existing POC bucket (imported): holds the shared email template today, and
# the Terraform remote state under terraform/state/.
resource "aws_s3_bucket" "assets" {
  bucket = "${var.name_prefix}-satyajit-2026"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}
