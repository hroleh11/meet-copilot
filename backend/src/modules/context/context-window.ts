import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import { MeetingStateStore, type WindowSegment } from '~/modules/meetings';

export interface TranscriptWindow {
  recent: WindowSegment[];
  stale: WindowSegment[];
}

@Injectable()
export class ContextWindow {
  constructor(
    private readonly meetingStateStore: MeetingStateStore,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async read(meetingId: string): Promise<TranscriptWindow> {
    const segments = await this.meetingStateStore.readWindow(meetingId);

    return splitByBudget(
      segments,
      this.configService.getOrThrow<number>('WINDOW_MAX_CHARS'),
    );
  }
}

export function splitByBudget(
  segments: WindowSegment[],
  maxChars: number,
): TranscriptWindow {
  let used = 0;
  let firstRecent = segments.length;

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const length = segments[index]?.text.length ?? 0;

    if (used + length > maxChars && firstRecent < segments.length) {
      break;
    }

    used += length;
    firstRecent = index;
  }

  return {
    recent: segments.slice(firstRecent),
    stale: segments.slice(0, firstRecent),
  };
}
