import { EventEmitter } from 'node:events';
import type { WebSocket } from 'ws';
import type { Language } from '~/generated/prisma/enums';
import type { SttStreamHandlers } from '~/infrastructure/stt';
import { SttConnection, type SttConnectionDeps } from './stt-connection';
import { STT_CLOSE_CODE, type SttSessionContext } from './types/stt.types';

const context: SttSessionContext = {
  userId: 'user-1',
  meetingId: 'meeting-1',
  language: 'en',
  speaker: 'me',
};

class FakeSocket extends EventEmitter {
  readonly OPEN = 1;
  readyState = 1;
  readonly sent: string[] = [];
  closedWith: number | null = null;

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(code: number): void {
    this.closedWith = code;
    this.readyState = 3;
  }

  messages(): { type: string; text?: string }[] {
    return this.sent.map((payload) => JSON.parse(payload) as { type: string });
  }
}

class FakeStream {
  constructor(private readonly handlers: SttStreamHandlers) {}

  readonly received: Buffer[] = [];

  send(audio: Buffer): void {
    this.received.push(audio);
  }

  async close(): Promise<void> {
    this.handlers.onResult({
      text: 'the tail of the sentence',
      isFinal: true,
      startMs: 1000,
      durationMs: 500,
    });
    this.handlers.onClose();

    await Promise.resolve();
  }
}

function build(): {
  socket: FakeSocket;
  connection: SttConnection;
  deps: SttConnectionDeps;
  heartbeats: string[];
} {
  const socket = new FakeSocket();
  const heartbeats: string[] = [];
  let stream: FakeStream | null = null;

  const deps: SttConnectionDeps = {
    sttProvider: {
      open: (_language: Language, handlers: SttStreamHandlers) => {
        stream = new FakeStream(handlers);

        return Promise.resolve(stream);
      },
    },
    meetingsRepository: {
      appendSegment: (data: { text: string }) =>
        Promise.resolve({
          id: 'segment-1',
          speaker: 'me',
          startMs: 0,
          durationMs: 0,
          ...data,
        }),
    },
    meetingStateStore: {
      appendToWindow: () => Promise.resolve(),
      touchAlive: (meetingId: string) => {
        heartbeats.push(meetingId);
        return Promise.resolve();
      },
    },
    usageRecorder: { record: () => Promise.resolve() },
    onFinalSegment: () => undefined,
  } as unknown as SttConnectionDeps;

  return {
    socket,
    connection: new SttConnection(socket as unknown as WebSocket, context, deps),
    deps,
    heartbeats,
  };
}

describe('SttConnection', () => {
  it('flushes the last utterance to the client before closing', async () => {
    const { socket, connection } = build();
    await connection.start();

    socket.emit('message', Buffer.from(JSON.stringify({ type: 'finish' })), false);
    await new Promise((resolve) => setImmediate(resolve));

    expect(socket.messages()).toEqual([
      expect.objectContaining({ type: 'final', text: 'the tail of the sentence' }),
    ]);
    expect(socket.closedWith).toBe(STT_CLOSE_CODE.finished);
  });

  it('keeps audio flowing to the provider', async () => {
    const { socket, connection } = build();
    await connection.start();

    socket.emit('message', Buffer.from([1, 2, 3, 4]), true);

    expect(socket.closedWith).toBeNull();
  });

  it('reports the meeting alive once per burst of audio', async () => {
    const { socket, connection, heartbeats } = build();
    await connection.start();

    socket.emit('message', Buffer.from([1, 2, 3, 4]), true);
    socket.emit('message', Buffer.from([5, 6, 7, 8]), true);

    expect(heartbeats).toEqual([context.meetingId]);
  });

  it('ignores text that is not a finish request', async () => {
    const { socket, connection } = build();
    await connection.start();

    socket.emit('message', Buffer.from('not json'), false);
    await new Promise((resolve) => setImmediate(resolve));

    expect(socket.closedWith).toBeNull();
  });
});
