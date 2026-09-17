import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { type WebSocket, WebSocketServer } from 'ws';
import type { Env } from '~/common/config';
import { SttProvider } from '~/infrastructure/stt';
import { MeetingStateStore, MeetingsRepository } from '~/modules/meetings';
import { UsageRecorder } from '~/modules/usage';
import { SttConnection } from './stt-connection';
import { SttRejection } from './stt-rejection';
import { SttAuthenticator } from './stt.authenticator';
import { buildSttRoute, matchMeetingId } from './stt-route';
import { STT_CLOSE_CODE } from './types/stt.types';

@Injectable()
export class SttServer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SttServer.name);
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly route: RegExp;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    configService: ConfigService<Env, true>,
    private readonly authenticator: SttAuthenticator,
    private readonly sttProvider: SttProvider,
    private readonly meetingsRepository: MeetingsRepository,
    private readonly meetingStateStore: MeetingStateStore,
    private readonly usageRecorder: UsageRecorder,
  ) {
    this.route = buildSttRoute(configService.getOrThrow<string>('API_PREFIX'));
  }

  onApplicationBootstrap(): void {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer() as Server;

    server.on('upgrade', (request, socket, head) =>
      this.handleUpgrade(request, socket, head),
    );
  }

  onApplicationShutdown(): void {
    this.wss.close();
  }

  private handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const meetingId = matchMeetingId(this.route, url.pathname);

    if (!meetingId) {
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (client) => {
      void this.attach(client, url, meetingId);
    });
  }

  private async attach(client: WebSocket, url: URL, meetingId: string): Promise<void> {
    try {
      const context = await this.authenticator.authorize(url, meetingId);
      const connection = new SttConnection(client, context, {
        sttProvider: this.sttProvider,
        meetingsRepository: this.meetingsRepository,
        meetingStateStore: this.meetingStateStore,
        usageRecorder: this.usageRecorder,
        onFinalSegment: () => undefined,
      });

      await connection.start();
    } catch (error) {
      if (error instanceof SttRejection) {
        client.close(error.code, error.message);
        return;
      }

      this.logger.error(
        `Could not open a speech stream for meeting ${meetingId}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.close(STT_CLOSE_CODE.failed, 'Speech recognition is unavailable');
    }
  }
}
