import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '~/app.module';
import { PrismaService } from '~/infrastructure/prisma';

const owner = {
  email: `owner-${randomUUID()}@example.com`,
  name: 'Owner',
  password: 'password1',
};

const intruder = {
  email: `intruder-${randomUUID()}@example.com`,
  name: 'Intruder',
  password: 'password1',
};

describe('Meetings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerCookies: string[] = [];
  let intruderCookies: string[] = [];
  let meetingId = '';

  const signUp = async (user: typeof owner): Promise<string[]> => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);

    return response.get('Set-Cookie') ?? [];
  };

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
    ownerCookies = await signUp(owner);
    intruderCookies = await signUp(intruder);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [owner.email, intruder.email] } },
    });
    await app.close();
  });

  it('starts a meeting for the signed-in user', async () => {
    const response = await request(app.getHttpServer())
      .post('/meetings')
      .set('Cookie', ownerCookies)
      .send({ profile: 'daily', language: 'uk', title: 'Дейлі' })
      .expect(201);

    meetingId = (response.body as { id: string }).id;

    expect(response.body).toMatchObject({
      status: 'live',
      title: 'Дейлі',
      endedAt: null,
    });
  });

  it('rejects a profile that is not one of the supported ones', async () => {
    await request(app.getHttpServer())
      .post('/meetings')
      .set('Cookie', ownerCookies)
      .send({ profile: 'standup', language: 'uk' })
      .expect(400);
  });

  it('lists the meeting for its owner only', async () => {
    const mine = await request(app.getHttpServer())
      .get('/meetings')
      .set('Cookie', ownerCookies)
      .expect(200);

    const theirs = await request(app.getHttpServer())
      .get('/meetings')
      .set('Cookie', intruderCookies)
      .expect(200);

    expect(mine.body).toHaveLength(1);
    expect(theirs.body).toHaveLength(0);
  });

  it('answers 404 when somebody else asks for the meeting', async () => {
    await request(app.getHttpServer())
      .get(`/meetings/${meetingId}`)
      .set('Cookie', intruderCookies)
      .expect(404);
  });

  it('returns details with empty transcript and zeroed usage', async () => {
    const response = await request(app.getHttpServer())
      .get(`/meetings/${meetingId}`)
      .set('Cookie', ownerCookies)
      .expect(200);

    expect(response.body).toMatchObject({
      summary: null,
      segments: [],
      generations: [],
      usage: { inputTokens: 0, outputTokens: 0, audioSeconds: 0 },
    });
  });

  it('finishes the meeting and stays idempotent', async () => {
    const first = await request(app.getHttpServer())
      .post(`/meetings/${meetingId}/finish`)
      .set('Cookie', ownerCookies)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/meetings/${meetingId}/finish`)
      .set('Cookie', ownerCookies)
      .expect(201);

    expect(first.body).toMatchObject({ status: 'finished' });
    expect((second.body as { endedAt: string }).endedAt).toBe(
      (first.body as { endedAt: string }).endedAt,
    );
  });

  it('stores the reply style and serves it back', async () => {
    await request(app.getHttpServer())
      .put('/settings')
      .set('Cookie', ownerCookies)
      .send({ style: 'Дуже коротко', defaultProfile: 'client_call' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/settings')
      .set('Cookie', ownerCookies)
      .expect(200);

    expect(response.body).toMatchObject({
      style: 'Дуже коротко',
      defaultProfile: 'client_call',
      defaultLanguage: 'uk',
    });
  });
});
