import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { Env } from '~/common/config';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '~/app.module';
import { PrismaService } from '~/infrastructure/prisma';

export interface TestAccount {
  email: string;
  name: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export class AppHarness {
  readonly emails: string[] = [];

  private constructor(
    readonly app: INestApplication<App>,
    readonly prisma: PrismaService,
  ) {}

  static async boot(
    customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
  ): Promise<AppHarness> {
    const base = Test.createTestingModule({ imports: [AppModule] });
    const moduleRef = await (customize ? customize(base) : base).compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api/v1');

    const env = app.get<ConfigService<Env, true>>(ConfigService);
    const limit = env.getOrThrow<number>('MAX_REQUEST_BODY_BYTES');
    app.useBodyParser('json', { limit });
    app.useBodyParser('urlencoded', { limit, extended: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    return new AppHarness(app, app.get(PrismaService));
  }

  get server(): App {
    return this.app.getHttpServer();
  }

  async signUp(prefix: string): Promise<TestAccount> {
    const account = {
      email: `${prefix}-${randomUUID()}@example.com`,
      name: 'Test Account',
      password: 'password1',
    };

    const response = await request(this.server)
      .post('/api/v1/auth/register')
      .send(account)
      .expect(201);

    const tokens = response.body as { accessToken: string; refreshToken: string };
    this.emails.push(account.email);

    return { ...account, ...tokens };
  }

  async shutdown(): Promise<void> {
    await this.prisma.user.deleteMany({ where: { email: { in: this.emails } } });
    await this.app.close();
  }
}

export const bearer = (token: string): [string, string] => [
  'Authorization',
  `Bearer ${token}`,
];
