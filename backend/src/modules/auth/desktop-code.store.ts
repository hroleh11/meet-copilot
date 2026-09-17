import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '~/infrastructure/redis';
import { DESKTOP_CODE_TTL_SECONDS } from './constants/auth.constants';

const KEY_PREFIX = 'desktop:auth:';

@Injectable()
export class DesktopCodeStore {
  constructor(private readonly redis: RedisService) {}

  async issue(userId: string): Promise<string> {
    const code = randomUUID();

    await this.redis.set(KEY_PREFIX + code, userId, DESKTOP_CODE_TTL_SECONDS);

    return code;
  }

  consume(code: string): Promise<string | null> {
    return this.redis.take(KEY_PREFIX + code);
  }
}
