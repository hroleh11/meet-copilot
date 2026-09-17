import { Global, type INestApplication, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AllExceptionsFilter } from '~/common/filters';
import { RequestIdMiddleware } from '~/common/middleware';
import { PrismaService } from '~/infrastructure/prisma';
import { RedisService } from '~/infrastructure/redis';
import { HealthModule } from '~/modules/health';

const stores = { postgres: true, redis: true };

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useValue: { isReachable: () => Promise.resolve(stores.postgres) },
    },
    {
      provide: RedisService,
      useValue: { isReachable: () => Promise.resolve(stores.redis) },
    },
  ],
  exports: [PrismaService, RedisService],
})
class FakeStoresModule {}

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FakeStoresModule, HealthModule],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    }).compile();

    const requestId = new RequestIdMiddleware();

    app = moduleRef.createNestApplication();
    app.use(requestId.use.bind(requestId));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 200 when both stores are up', async () => {
    stores.postgres = true;
    stores.redis = true;

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', postgres: 'up', redis: 'up' });
  });

  it('answers 503 when a store is down', async () => {
    stores.postgres = true;
    stores.redis = false;

    await request(app.getHttpServer())
      .get('/health')
      .expect(503)
      .expect({ status: 'degraded', postgres: 'up', redis: 'down' });
  });

  it('returns the error shape with a request id for an unknown route', async () => {
    const response = await request(app.getHttpServer()).get('/nope').expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
    });
    expect(response.body).toHaveProperty('requestId');
  });
});
