# AppSync GraphQL API
resource "aws_appsync_graphql_api" "ailment_api" {
  name                = "${var.project_name}-api"
  authentication_type = var.appsync_auth_type

  schema = file("${path.module}/schema.graphql")

  # Enable CloudWatch logging
  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_logs.arn
    field_log_level          = "ALL"
  }

  # Enable real-time subscriptions
  xray_enabled = true

  tags = {
    Name = "${var.project_name}-appsync-api"
  }
}

# API Key for authentication (valid for 365 days)
resource "aws_appsync_api_key" "ailment_api_key" {
  api_id  = aws_appsync_graphql_api.ailment_api.id
  expires = timeadd(timestamp(), "8760h") # 365 days
}

# IAM Role for AppSync to access DynamoDB
resource "aws_iam_role" "appsync_dynamodb" {
  name = "${var.project_name}-appsync-dynamodb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "appsync_dynamodb" {
  name = "${var.project_name}-appsync-dynamodb-policy"
  role = aws_iam_role.appsync_dynamodb.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.ailment.arn,
          "${aws_dynamodb_table.ailment.arn}/index/*"
        ]
      }
    ]
  })
}

# IAM Role for CloudWatch Logs
resource "aws_iam_role" "appsync_logs" {
  name = "${var.project_name}-appsync-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "appsync_logs" {
  role       = aws_iam_role.appsync_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"
}

# DynamoDB Data Source
resource "aws_appsync_datasource" "ailment_dynamodb" {
  api_id           = aws_appsync_graphql_api.ailment_api.id
  name             = "AilmentDynamoDB"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_dynamodb.arn

  dynamodb_config {
    table_name = aws_dynamodb_table.ailment.name
    region     = var.aws_region
  }
}

# None Data Source for local resolvers (subscriptions)
resource "aws_appsync_datasource" "none" {
  api_id = aws_appsync_graphql_api.ailment_api.id
  name   = "NoneDataSource"
  type   = "NONE"
}

# Resolvers
# Query: getAilments
resource "aws_appsync_resolver" "get_ailments" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Query"
  field       = "getAilments"
  data_source = aws_appsync_datasource.ailment_dynamodb.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "Scan"
}
EOF

  response_template = <<EOF
$util.toJson($ctx.result.items)
EOF
}

# Query: getAilment
resource "aws_appsync_resolver" "get_ailment" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Query"
  field       = "getAilment"
  data_source = aws_appsync_datasource.ailment_dynamodb.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  }
}
EOF

  response_template = <<EOF
$util.toJson($ctx.result)
EOF
}

# Mutation: createAilment
resource "aws_appsync_resolver" "create_ailment" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Mutation"
  field       = "createAilment"
  data_source = aws_appsync_datasource.ailment_dynamodb.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "PutItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.args.input.id, $util.autoId()))
  },
  "attributeValues": $util.dynamodb.toMapValuesJson($ctx.args.input)
}
EOF

  response_template = <<EOF
$util.toJson($ctx.result)
EOF
}

# Mutation: updateAilment
resource "aws_appsync_resolver" "update_ailment" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Mutation"
  field       = "updateAilment"
  data_source = aws_appsync_datasource.ailment_dynamodb.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "PutItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  },
  "attributeValues": {
    "ailment": $util.dynamodb.toDynamoDBJson($ctx.args.input.ailment),
    "treatments": $util.dynamodb.toDynamoDBJson($ctx.args.input.treatments),
    "diagnostics": $util.dynamodb.toDynamoDBJson($ctx.args.input.diagnostics)
  }
}
EOF

  response_template = <<EOF
$util.toJson($ctx.result)
EOF
}

# Mutation: deleteAilment
resource "aws_appsync_resolver" "delete_ailment" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Mutation"
  field       = "deleteAilment"
  data_source = aws_appsync_datasource.ailment_dynamodb.name

  request_template = <<EOF
{
  "version": "2018-05-29",
  "operation": "DeleteItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  }
}
EOF

  response_template = <<EOF
{
  "id": $util.toJson($ctx.args.id),
  "success": true,
  "message": "Ailment deleted successfully"
}
EOF
}

# Subscription resolvers - using NONE data source for @aws_subscribe to pass through mutation results
resource "aws_appsync_resolver" "subscription_created" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Subscription"
  field       = "ailmentCreated"
  data_source = aws_appsync_datasource.none.name

  request_template = <<EOF
{
  "version": "2017-02-28",
  "payload": {}
}
EOF

  response_template = <<EOF
$util.toJson(null)
EOF
}

resource "aws_appsync_resolver" "subscription_updated" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Subscription"
  field       = "ailmentUpdated"
  data_source = aws_appsync_datasource.none.name

  request_template = <<EOF
{
  "version": "2017-02-28",
  "payload": {}
}
EOF

  response_template = <<EOF
$util.toJson(null)
EOF
}

resource "aws_appsync_resolver" "subscription_deleted" {
  api_id      = aws_appsync_graphql_api.ailment_api.id
  type        = "Subscription"
  field       = "ailmentDeleted"
  data_source = aws_appsync_datasource.none.name

  request_template = <<EOF
{
  "version": "2017-02-28",
  "payload": {}
}
EOF

  response_template = <<EOF
$util.toJson(null)
EOF
}

# Outputs
output "appsync_api_id" {
  value       = aws_appsync_graphql_api.ailment_api.id
  description = "AppSync API ID"
}

output "appsync_api_url" {
  value       = aws_appsync_graphql_api.ailment_api.uris["GRAPHQL"]
  description = "AppSync GraphQL endpoint URL"
}

output "appsync_realtime_url" {
  value       = aws_appsync_graphql_api.ailment_api.uris["REALTIME"]
  description = "AppSync real-time WebSocket endpoint URL"
}

output "appsync_api_key" {
  value       = aws_appsync_api_key.ailment_api_key.key
  description = "AppSync API key"
  sensitive   = true
}
