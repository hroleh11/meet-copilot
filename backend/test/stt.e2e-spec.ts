import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import WebSocket from 'ws';
import type { Language } from '~/generated/prisma/enums';
import {
  SttProvider,
  type SttStream,
  type SttStreamHandlers,
} from '~/infrastructure/stt';
import { AppHarness, bearer, type TestAccount } from './app-harness';

class FakeSttProvider extends SttProvider {
  handlers: SttStreamHandlers | null = null;
  received = 0;

  open(_language: Language, handlers: SttStreamHandlers): Promise<SttStream> {
    this.handlers = handlers;

    return Promise.resolve({
      send: (audio: Buffer) => {
        this.received += audio.byteLength;
      },
      close: () => Promise.resolve(),
    });
  }
}

describe('Speech stream (e2e)', () => {
  const provider = new FakeSttProvider();
  let harness: AppHarness;
  let account: TestAccount;
  let baseUrl = '';
  let meetingId = '';

  const openSocket = (query: string): WebSocket =>
    new WebSocket(`${baseUrl}/api/v1/meetings/${meetingId}/stt?${query}`);

  const openStream = async (speaker: string): Promise<WebSocket> => {
    provider.handlers = null;

    const socket = openSocket(`token=${account.accessToken}&speaker=${speaker}`);
    await opened(socket);
    await waitFor(() => provider.handlers !== null);

    return socket;
  };

  beforeAll(async () => {
    harness = await AppHarness.boot((builder) =>
      builder.overrideProvider(SttProvider).useValue(provider),
    );
    await harness.app.listen(0);

    const server = harness.server as unknown as Server;
    baseUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;

    account = await harness.signUp('stt');

    const meeting = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(account.accessToken))
      .send({ profile: 'daily', language: 'uk' })
      .expect(201);

    meetingId = (meeting.body as { id: string }).id;
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('refuses a stream without a token', async () => {
    await expect(closeCodeOf(openSocket('speaker=me'))).resolves.toBe(4401);
  });

  it('refuses a stream for an unknown speaker', async () => {
    await expect(
      closeCodeOf(openSocket(`token=${account.accessToken}&speaker=everyone`)),
    ).resolves.toBe(4404);
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
    await expect(harness.prisma.segment.count({ where: { meetingId } })).resolves.toBe(0);
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

    const stored = await harness.prisma.segment.findUnique({ where: { id: message.id } });

    expect(message.type).toBe('final');
    expect(stored).toMatchObject({ text: 'Що можна покращити?', speaker: 'other' });
  });
});

function opened(socket: WebSocket): Promise<void> {
  return new Promise((resolve) => socket.once('open', () => resolve()));
}

function nextMessage(socket: WebSocket): Promise<unknown> {
  return new Promise((resolve) =>
    socket.once('message', (data: Buffer) => resolve(JSON.parse(data.toString()))),
  );
}

function closeCodeOf(socket: WebSocket): Promise<number> {
  return new Promise((resolve) => socket.once('close', (code: number) => resolve(code)));
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
