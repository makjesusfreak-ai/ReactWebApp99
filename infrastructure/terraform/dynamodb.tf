# DynamoDB Table for Ailments
resource "aws_dynamodb_table" "ailment" {
  name           = var.dynamodb_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Enable point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Enable server-side encryption
  server_side_encryption {
    enabled = true
  }

  # Enable DynamoDB Streams for real-time sync with AppSync
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Global Secondary Index for querying by ailment name
  global_secondary_index {
    name            = "ailment-name-index"
    hash_key        = "ailmentName"
    projection_type = "ALL"
  }

  attribute {
    name = "ailmentName"
    type = "S"
  }

  # TTL configuration (optional, for data cleanup)
  ttl {
    attribute_name = "ttl"
    enabled        = false
  }

  tags = {
    Name = "${var.project_name}-ailment-table"
  }
}

# DynamoDB Table for AppSync subscriptions (for connection tracking)
resource "aws_dynamodb_table" "appsync_subscriptions" {
  name           = "${var.project_name}-subscriptions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "connectionId"
  range_key      = "subscriptionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  attribute {
    name = "subscriptionId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${var.project_name}-subscriptions-table"
  }
}

# Output the table ARN and stream ARN
output "dynamodb_table_arn" {
  value       = aws_dynamodb_table.ailment.arn
  description = "ARN of the Ailment DynamoDB table"
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.ailment.name
  description = "Name of the Ailment DynamoDB table"
}

output "dynamodb_stream_arn" {
  value       = aws_dynamodb_table.ailment.stream_arn
  description = "Stream ARN for real-time updates"
}
