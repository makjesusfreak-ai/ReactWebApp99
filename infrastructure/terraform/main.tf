terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Using local backend for development
  # For production, uncomment and configure S3 backend after creating the bucket:
  # backend "s3" {
  #   bucket         = "ailment-tracker-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   use_lockfile   = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "AilmentTracker"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
