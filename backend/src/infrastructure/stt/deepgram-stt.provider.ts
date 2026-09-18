import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import type { Env } from '~/common/config';
import type { Language } from '~/generated/prisma/enums';
import { toSttResult } from './deepgram-result.mapper';
import { buildDeepgramUrl } from './deepgram-url';
import { SttProvider, type SttStream, type SttStreamHandlers } from './stt.provider';

const KEEP_ALIVE_INTERVAL_MS = 8_000;
const FLUSH_TIMEOUT_MS = 3_000;

@Injectable()
export class DeepgramSttProvider extends SttProvider {
  private readonly logger = new Logger(DeepgramSttProvider.name);
  private readonly apiKey: string;
  private readonly connectTimeoutMs: number;

  constructor(configService: ConfigService<Env, true>) {
    super();
    this.apiKey = configService.getOrThrow<string>('DEEPGRAM_API_KEY');
    this.connectTimeoutMs = configService.getOrThrow<number>('STT_CONNECT_TIMEOUT_MS');
  }

  async open(language: Language, handlers: SttStreamHandlers): Promise<SttStream> {
    const socket = new WebSocket(buildDeepgramUrl(language), {
      headers: { Authorization: `Token ${this.apiKey}` },
    });

    socket.on('message', (data: Buffer) => {
      const result = toSttResult(parse(data));

      if (result) {
        handlers.onResult(result);
      }
    });

    socket.on('error', (error: Error) => {
      this.logger.error(`Deepgram stream failed: ${error.message}`);
      handlers.onError('Speech recognition failed');
    });

    socket.on('close', () => handlers.onClose());

    await this.waitForOpen(socket);

    const keepAlive = setInterval(() => {
      this.send(socket, JSON.stringify({ type: 'KeepAlive' }));
    }, KEEP_ALIVE_INTERVAL_MS);

    return {
      send: (audio) => this.send(socket, audio),
      close: () => {
        clearInterval(keepAlive);

        return this.flush(socket);
      },
    };
  }

  private flush(socket: WebSocket): Promise<void> {
    if (socket.readyState !== WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        socket.terminate();
        resolve();
      }, FLUSH_TIMEOUT_MS);

      socket.once('close', () => {
        clearTimeout(timer);
        resolve();
      });

      this.send(socket, JSON.stringify({ type: 'CloseStream' }));
    });
  }

  private waitForOpen(socket: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.terminate();
        reject(new Error('Deepgram did not accept the connection in time'));
      }, this.connectTimeoutMs);

      const settle = (error?: Error): void => {
        clearTimeout(timer);

        if (error) {
          reject(error);
          return;
        }

        resolve();
      };

      socket.once('open', () => settle());
      socket.once('error', (error: Error) => settle(error));
      socket.once('unexpected-response', (_request, response) =>
        settle(
          new Error(`Deepgram refused the connection with ${response.statusCode ?? 0}`),
        ),
      );
    });
  }

  private send(socket: WebSocket, payload: Buffer | string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
}

function parse(data: Buffer): unknown {
  try {
    return JSON.parse(data.toString()) as unknown;
  } catch {
    return null;
  }
}
