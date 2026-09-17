import { Test } from '@nestjs/testing';
import { PrismaService } from '~/infrastructure/prisma';
import { RedisService } from '~/infrastructure/redis';
import { HealthService } from './health.service';

async function buildService(
  postgresReachable: boolean,
  redisReachable: boolean,
): Promise<HealthService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      HealthService,
      {
        provide: PrismaService,
        useValue: { isReachable: () => Promise.resolve(postgresReachable) },
      },
      {
        provide: RedisService,
        useValue: { isReachable: () => Promise.resolve(redisReachable) },
      },
    ],
  }).compile();

  return moduleRef.get(HealthService);
}

describe('HealthService', () => {
  it('reports ok when both stores answer', async () => {
    const service = await buildService(true, true);

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      postgres: 'up',
      redis: 'up',
    });
  });

  it('reports degraded and names the store that is down', async () => {
    const service = await buildService(true, false);

    await expect(service.check()).resolves.toEqual({
      status: 'degraded',
      postgres: 'up',
      redis: 'down',
    });
  });
});
