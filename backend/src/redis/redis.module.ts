import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './constants';

// Re-export for external use
export { REDIS_CLIENT } from './constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', undefined),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          },
        });

        redis.on('error', (err) => {
          console.warn('Redis connection error:', err.message);
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected');
        });

        // Try to connect, but don't fail if Redis is unavailable
        redis.connect().catch((err) => {
          console.warn('Redis not available, caching disabled:', err.message);
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
