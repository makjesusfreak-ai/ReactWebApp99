variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ailment-tracker"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
  default     = "Ailment"
}

variable "appsync_auth_type" {
  description = "AppSync authentication type"
  type        = string
  default     = "API_KEY"
}
