import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '~/app.module';
import { PrismaService } from '~/infrastructure/prisma';

const credentials = {
  email: `e2e-${randomUUID()}@example.com`,
  name: 'End To End',
  password: 'password1',
};

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookies: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: credentials.email } });
    await app.close();
  });

  it('registers and signs the new user in', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    cookies = response.get('Set-Cookie') ?? [];
    expect(cookies.join(';')).toContain('accessToken=');
  });

  it('rejects a weak password before it reaches the service', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...credentials, email: `weak-${credentials.email}`, password: 'short' })
      .expect(400);
  });

  it('returns the profile for the signed-in user', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(response.body).toMatchObject({
      email: credentials.email,
      name: credentials.name,
    });
  });

  it('refuses the profile without a token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('rotates tokens and rejects the replayed refresh token', async () => {
    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(201);

    expect(rotated.get('Set-Cookie')?.join(';')).toContain('refreshToken=');

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(403);
  });
});
