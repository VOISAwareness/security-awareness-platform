# Credentials come from the environment (locally: AWS_PROFILE=vshield;
# in CI: GitHub OIDC role). No profile is hardcoded so both paths work.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "security-awareness-platform"
      ManagedBy = "terraform"
      Env       = var.environment
      Owner     = "Satyajit"
    }
  }
}
