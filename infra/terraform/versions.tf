terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Remote state in the existing POC bucket. S3-native locking (use_lockfile)
  # avoids a paid DynamoDB lock table — see docs/vault note 10 (cost).
  backend "s3" {
    bucket       = "security-awareness-poc-satyajit-2026"
    key          = "terraform/state/poc.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}
