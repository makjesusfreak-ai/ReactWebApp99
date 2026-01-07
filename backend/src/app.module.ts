import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AilmentModule } from './ailment/ailment.module';
import { DynamoDBModule } from './dynamodb/dynamodb.module';
import { RedisModule } from './redis/redis.module';
import { PubSubModule } from './pubsub/pubsub.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // GraphQL configuration with subscriptions
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
      context: ({ req, res, connection }) => {
        if (connection) {
          return { req: connection.context, res };
        }
        return { req, res };
      },
    }),

    // Feature modules
    DynamoDBModule,
    RedisModule,
    PubSubModule,
    AilmentModule,
  ],
})
export class AppModule {}
