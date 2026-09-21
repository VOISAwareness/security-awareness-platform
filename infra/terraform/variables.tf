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
