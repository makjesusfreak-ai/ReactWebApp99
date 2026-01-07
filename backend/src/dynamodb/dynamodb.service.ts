import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DYNAMODB_CLIENT } from './constants';

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private tableName: string;

  constructor(
    @Inject(DYNAMODB_CLIENT)
    private readonly docClient: DynamoDBDocumentClient,
    private readonly configService: ConfigService,
  ) {
    this.tableName = this.configService.get('DYNAMODB_TABLE_NAME', 'Ailment');
  }

  async onModuleInit() {
    // Create table if it doesn't exist (for local development)
    if (this.configService.get('NODE_ENV') === 'development') {
      await this.ensureTableExists();
    }
  }

  private async ensureTableExists(): Promise<void> {
    try {
      const client = new DynamoDBClient({
        region: this.configService.get('AWS_REGION', 'us-east-1'),
        endpoint: this.configService.get('DYNAMODB_ENDPOINT'),
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', 'local'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', 'local'),
        },
      });

      await client.send(
        new DescribeTableCommand({ TableName: this.tableName }),
      );
      console.log(`✅ DynamoDB table '${this.tableName}' exists`);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        console.log(`Creating DynamoDB table '${this.tableName}'...`);
        await this.createTable();
      } else {
        console.warn('DynamoDB connection warning:', error.message);
      }
    }
  }

  private async createTable(): Promise<void> {
    const client = new DynamoDBClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      endpoint: this.configService.get('DYNAMODB_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', 'local'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', 'local'),
      },
    });

    try {
      await client.send(
        new CreateTableCommand({
          TableName: this.tableName,
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
          BillingMode: 'PAY_PER_REQUEST',
        }),
      );
      console.log(`✅ DynamoDB table '${this.tableName}' created`);
    } catch (error) {
      console.error('Failed to create DynamoDB table:', error.message);
    }
  }

  async getItem<T>(id: string): Promise<T | null> {
    try {
      const result = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );
      return (result.Item as T) || null;
    } catch (error) {
      console.error('DynamoDB getItem error:', error);
      return null;
    }
  }

  async putItem<T extends { id: string }>(item: T): Promise<T> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
    return item;
  }

  async deleteItem(id: string): Promise<boolean> {
    try {
      await this.docClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id },
        }),
      );
      return true;
    } catch (error) {
      console.error('DynamoDB deleteItem error:', error);
      return false;
    }
  }

  async scan<T>(): Promise<T[]> {
    try {
      const result = await this.docClient.send(
        new ScanCommand({
          TableName: this.tableName,
        }),
      );
      return (result.Items as T[]) || [];
    } catch (error) {
      console.error('DynamoDB scan error:', error);
      return [];
    }
  }

  async updateItem<T>(
    id: string,
    updateExpression: string,
    expressionAttributeNames: Record<string, string>,
    expressionAttributeValues: Record<string, any>,
  ): Promise<T | null> {
    try {
      const result = await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        }),
      );
      return (result.Attributes as T) || null;
    } catch (error) {
      console.error('DynamoDB updateItem error:', error);
      return null;
    }
  }
}
