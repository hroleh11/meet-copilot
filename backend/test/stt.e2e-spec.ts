import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import WebSocket from 'ws';
import { AppModule } from '~/app.module';
import {
  SttProvider,
  type SttStream,
  type SttStreamHandlers,
} from '~/infrastructure/stt';
import { PrismaService } from '~/infrastructure/prisma';
import type { Language } from '~/generated/prisma/enums';

const user = {
  email: `stt-${randomUUID()}@example.com`,
  name: 'Stt Tester',
  password: 'password1',
};

class FakeSttProvider extends SttProvider {
  handlers: SttStreamHandlers | null = null;
  received = 0;
  closed = false;

  open(_language: Language, handlers: SttStreamHandlers): Promise<SttStream> {
    this.handlers = handlers;

    return Promise.resolve({
      send: (audio: Buffer) => {
        this.received += audio.byteLength;
      },
      close: () => {
        this.closed = true;
      },
    });
  }
}

describe('Speech stream (e2e)', () => {
  const provider = new FakeSttProvider();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl = '';
  let accessToken = '';
  let meetingId = '';

  const openSocket = (query: string): WebSocket =>
    new WebSocket(`${baseUrl}/api/v1/meetings/${meetingId}/stt?${query}`);

  const openStream = async (speaker: string): Promise<WebSocket> => {
    provider.handlers = null;

    const socket = openSocket(`token=${accessToken}&speaker=${speaker}`);
    await once(socket, 'open');
    await waitForHandlers(provider);

    return socket;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SttProvider)
      .useValue(provider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    await app.listen(0);

    prisma = app.get(PrismaService);
    const server = app.getHttpServer() as unknown as Server;
    baseUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(user)
      .expect(201);

    const tokens = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(201);

    accessToken = readCookie(tokens.get('Set-Cookie') ?? [], 'accessToken');

    const meeting = await request(app.getHttpServer())
      .post('/api/v1/meetings')
      .set('Cookie', tokens.get('Set-Cookie') ?? [])
      .send({ profile: 'daily', language: 'uk' })
      .expect(201);

    meetingId = (meeting.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await app.close();
  });

  it('refuses a stream without a token', async () => {
    const code = await closeCodeOf(openSocket('speaker=me'));

    expect(code).toBe(4401);
  });

  it('refuses a stream for an unknown speaker', async () => {
    const code = await closeCodeOf(openSocket(`token=${accessToken}&speaker=everyone`));

    expect(code).toBe(4404);
  });

  it('streams interim text back without storing it', async () => {
    const socket = await openStream('me');

    provider.handlers?.onResult({
      text: 'привіт',
      isFinal: false,
      startMs: 0,
      durationMs: 400,
    });

    const message = await nextMessage(socket);
    socket.close();

    expect(message).toMatchObject({ type: 'partial', text: 'привіт', speaker: 'me' });
    await expect(prisma.segment.count({ where: { meetingId } })).resolves.toBe(0);
  });

  it('stores a final segment and echoes it with its id', async () => {
    const socket = await openStream('other');

    socket.send(Buffer.alloc(3200));
    await waitFor(() => provider.received === 3200);
    provider.handlers?.onResult({
      text: 'Що можна покращити?',
      isFinal: true,
      startMs: 1000,
      durationMs: 900,
    });

    const message = (await nextMessage(socket)) as { id: string; type: string };
    socket.close();

    const stored = await prisma.segment.findUnique({ where: { id: message.id } });

    expect(message.type).toBe('final');
    expect(stored).toMatchObject({ text: 'Що можна покращити?', speaker: 'other' });
    expect(provider.received).toBe(3200);
  });
});

function readCookie(cookies: string[], name: string): string {
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match ? (match.split(';')[0]?.split('=')[1] ?? '') : '';
}

function once(socket: WebSocket, event: 'open'): Promise<void> {
  return new Promise((resolve) => socket.once(event, () => resolve()));
}

function waitFor(condition: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 3000;
    const tick = (): void => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() > deadline) {
        reject(new Error('Condition was not met in time'));
        return;
      }

      setTimeout(tick, 10);
    };

    tick();
  });
}

function waitForHandlers(provider: FakeSttProvider): Promise<void> {
  return waitFor(() => provider.handlers !== null);
}

function nextMessage(socket: WebSocket): Promise<unknown> {
  return new Promise((resolve) =>
    socket.once('message', (data: Buffer) => resolve(JSON.parse(data.toString()))),
  );
}

function closeCodeOf(socket: WebSocket): Promise<number> {
  return new Promise((resolve) => socket.once('close', (code: number) => resolve(code)));
}
