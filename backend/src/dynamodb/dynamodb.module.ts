import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBService } from './dynamodb.service';
import { DYNAMODB_CLIENT } from './constants';

// Re-export for external use
export { DYNAMODB_CLIENT } from './constants';

@Global()
@Module({
  providers: [
    {
      provide: DYNAMODB_CLIENT,
      useFactory: (configService: ConfigService) => {
        const client = new DynamoDBClient({
          region: configService.get('AWS_REGION', 'us-east-1'),
          endpoint: configService.get('DYNAMODB_ENDPOINT'),
          credentials: {
            accessKeyId: configService.get('AWS_ACCESS_KEY_ID', 'local'),
            secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY', 'local'),
          },
        });

        return DynamoDBDocumentClient.from(client, {
          marshallOptions: {
            removeUndefinedValues: true,
          },
        });
      },
      inject: [ConfigService],
    },
    DynamoDBService,
  ],
  exports: [DYNAMODB_CLIENT, DynamoDBService],
})
export class DynamoDBModule {}
