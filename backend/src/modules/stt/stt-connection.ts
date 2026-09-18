import { Logger } from '@nestjs/common';
import type { WebSocket } from 'ws';
import type { SttProvider, SttResult, SttStream } from '~/infrastructure/stt';
import type { MeetingStateStore, MeetingsRepository } from '~/modules/meetings';
import type { UsageRecorder } from '~/modules/usage';
import {
  STT_CLOSE_CODE,
  type SttClientMessage,
  type SttSessionContext,
} from './types/stt.types';

const BYTES_PER_SECOND = 16_000 * 2;

export interface SttConnectionDeps {
  sttProvider: SttProvider;
  meetingsRepository: MeetingsRepository;
  meetingStateStore: MeetingStateStore;
  usageRecorder: UsageRecorder;
  onFinalSegment: (meetingId: string) => void;
}

export class SttConnection {
  private readonly logger = new Logger(SttConnection.name);
  private stream: SttStream | null = null;
  private pending: Buffer[] = [];
  private receivedBytes = 0;
  private closed = false;

  constructor(
    private readonly socket: WebSocket,
    private readonly context: SttSessionContext,
    private readonly deps: SttConnectionDeps,
  ) {}

  async start(): Promise<void> {
    this.socket.on('message', (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        return;
      }

      this.receivedBytes += data.byteLength;

      if (this.stream) {
        this.stream.send(data);
      } else {
        this.pending.push(data);
      }
    });

    this.socket.on('close', () => void this.finish());
    this.socket.on('error', () => void this.finish());

    const stream = await this.deps.sttProvider.open(this.context.language, {
      onResult: (result) => void this.handleResult(result),
      onError: (message) => this.send({ type: 'error', message }),
      onClose: () => this.close(STT_CLOSE_CODE.failed),
    });

    if (this.closed) {
      await stream.close();
      return;
    }

    this.stream = stream;

    for (const frame of this.pending) {
      stream.send(frame);
    }

    this.pending = [];
  }

  private async handleResult(result: SttResult): Promise<void> {
    if (!result.isFinal) {
      this.send({
        type: 'partial',
        id: '',
        speaker: this.context.speaker,
        ...toPayload(result),
      });
      return;
    }

    try {
      const segment = await this.deps.meetingsRepository.appendSegment({
        meetingId: this.context.meetingId,
        speaker: this.context.speaker,
        text: result.text,
        startMs: result.startMs,
        durationMs: result.durationMs,
      });

      await this.deps.meetingStateStore.appendToWindow(this.context.meetingId, {
        id: segment.id,
        speaker: segment.speaker,
        text: segment.text,
        startMs: segment.startMs,
        durationMs: segment.durationMs,
      });

      this.send({
        type: 'final',
        id: segment.id,
        speaker: this.context.speaker,
        ...toPayload(result),
      });

      this.deps.onFinalSegment(this.context.meetingId);
    } catch (error) {
      this.logger.error(
        `Failed to store a segment for meeting ${this.context.meetingId}`,
        error instanceof Error ? error.stack : String(error),
      );
      this.send({ type: 'error', message: 'Could not store the transcript' });
    }
  }

  private async finish(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    const stream = this.stream;
    this.stream = null;
    await stream?.close();

    await this.deps.usageRecorder.record({
      userId: this.context.userId,
      meetingId: this.context.meetingId,
      kind: 'stt',
      audioSeconds: Math.round(this.receivedBytes / BYTES_PER_SECOND),
    });
  }

  private send(message: SttClientMessage): void {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private close(code: number): void {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.close(code);
    }
  }
}

function toPayload(result: SttResult): {
  text: string;
  startMs: number;
  durationMs: number;
} {
  return { text: result.text, startMs: result.startMs, durationMs: result.durationMs };
}
