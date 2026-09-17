import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/infrastructure/prisma';
import { RedisService } from '~/infrastructure/redis';
import type { DependencyStatus, HealthResponse } from './dto/health.responses';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [postgresReachable, redisReachable] = await Promise.all([
      this.prisma.isReachable(),
      this.redis.isReachable(),
    ]);

    const postgres = toStatus(postgresReachable);
    const redis = toStatus(redisReachable);

    return {
      status: postgresReachable && redisReachable ? 'ok' : 'degraded',
      postgres,
      redis,
    };
  }
}

function toStatus(reachable: boolean): DependencyStatus {
  return reachable ? 'up' : 'down';
}
