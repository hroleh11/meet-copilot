import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '~/common/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(configService: ConfigService<Env, true>) {
    this.client = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  read(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  take(key: string): Promise<string | null> {
    return this.client.getdel(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async writeHash(key: string, values: Record<string, string>): Promise<void> {
    await this.client.hset(key, values);
  }

  readHash(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async pushToList(key: string, value: string): Promise<void> {
    await this.client.rpush(key, value);
  }

  readList(key: string): Promise<string[]> {
    return this.client.lrange(key, 0, -1);
  }

  async trimList(key: string, keepLast: number): Promise<void> {
    await this.client.ltrim(key, -keepLast, -1);
  }

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    return (await this.client.set(key, '1', 'EX', ttlSeconds, 'NX')) === 'OK';
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async isReachable(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
