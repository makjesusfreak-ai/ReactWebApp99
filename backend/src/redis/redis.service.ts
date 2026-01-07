import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './constants';

@Injectable()
export class RedisService {
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  private isConnected(): boolean {
    return this.redis.status === 'ready';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;

    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      console.warn('Redis get error:', error.message);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.warn('Redis set error:', error.message);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn('Redis delete error:', error.message);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Redis deletePattern error:', error.message);
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const data = await fetchFn();

    // Cache the result
    await this.set(key, data, ttl);

    return data;
  }

  async invalidateAilmentCache(ailmentId?: string): Promise<void> {
    if (ailmentId) {
      await this.delete(`ailment:${ailmentId}`);
    }
    await this.delete('ailments:all');
  }
}
