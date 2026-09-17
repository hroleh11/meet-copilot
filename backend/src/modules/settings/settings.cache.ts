import { Injectable } from '@nestjs/common';
import { RedisService } from '~/infrastructure/redis';
import type { SettingsResponse } from './dto/settings.responses';

const KEY_PREFIX = 'settings:';
const TTL_SECONDS = 300;

@Injectable()
export class SettingsCache {
  constructor(private readonly redis: RedisService) {}

  async read(userId: string): Promise<SettingsResponse | null> {
    const cached = await this.redis.read(KEY_PREFIX + userId);

    return cached ? (JSON.parse(cached) as SettingsResponse) : null;
  }

  write(userId: string, settings: SettingsResponse): Promise<void> {
    return this.redis.set(KEY_PREFIX + userId, JSON.stringify(settings), TTL_SECONDS);
  }

  drop(userId: string): Promise<void> {
    return this.redis.delete(KEY_PREFIX + userId);
  }
}
