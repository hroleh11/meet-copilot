import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { Language, MeetingProfile } from '~/generated/prisma/enums';
import { RedisService } from '~/infrastructure/redis';
import type {
  MeetingLiveState,
  MeetingScreenshot,
  WindowSegment,
} from './types/meetings.types';

const stateKey = (meetingId: string): string => `meeting:${meetingId}:state`;
const windowKey = (meetingId: string): string => `meeting:${meetingId}:window`;
const summaryKey = (meetingId: string): string => `meeting:${meetingId}:summary`;
const summarizeLockKey = (meetingId: string): string =>
  `meeting:${meetingId}:summarize:lock`;
const aliveKey = (meetingId: string): string => `meeting:${meetingId}:alive`;
const screenshotKey = (meetingId: string): string => `meeting:${meetingId}:screenshot`;

@Injectable()
export class MeetingStateStore {
  constructor(
    private readonly redis: RedisService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  initialize(meetingId: string, state: MeetingLiveState): Promise<void> {
    return this.redis.writeHash(stateKey(meetingId), {
      language: state.language,
      profile: state.profile,
      style: state.style,
    });
  }

  async readState(meetingId: string): Promise<MeetingLiveState | null> {
    const stored = await this.redis.readHash(stateKey(meetingId));

    if (!stored.language || !stored.profile) {
      return null;
    }

    return {
      language: stored.language as Language,
      profile: stored.profile as MeetingProfile,
      style: stored.style ?? '',
    };
  }

  async readLastAnswer(meetingId: string): Promise<string | null> {
    const stored = await this.redis.readHash(stateKey(meetingId));

    return stored.lastAnswer ?? null;
  }

  writeLastAnswer(meetingId: string, answer: string): Promise<void> {
    return this.redis.writeHash(stateKey(meetingId), { lastAnswer: answer });
  }

  writeScreenshot(meetingId: string, screenshot: MeetingScreenshot): Promise<void> {
    return this.redis.set(
      screenshotKey(meetingId),
      JSON.stringify(screenshot),
      this.configService.getOrThrow<number>('SCREENSHOT_TTL_SECONDS'),
    );
  }

  async readScreenshot(meetingId: string): Promise<MeetingScreenshot | null> {
    const stored = await this.redis.read(screenshotKey(meetingId));

    return stored === null ? null : (JSON.parse(stored) as MeetingScreenshot);
  }

  clearScreenshot(meetingId: string): Promise<void> {
    return this.redis.delete(screenshotKey(meetingId));
  }

  appendToWindow(meetingId: string, segment: WindowSegment): Promise<void> {
    return this.redis.pushToList(windowKey(meetingId), JSON.stringify(segment));
  }

  async readWindow(meetingId: string): Promise<WindowSegment[]> {
    const stored = await this.redis.readList(windowKey(meetingId));

    return stored.map((entry) => JSON.parse(entry) as WindowSegment);
  }

  trimWindow(meetingId: string, keepLast: number): Promise<void> {
    return this.redis.trimList(windowKey(meetingId), keepLast);
  }

  async readSummary(meetingId: string): Promise<string | null> {
    return this.redis.read(summaryKey(meetingId));
  }

  writeSummary(meetingId: string, summary: string): Promise<void> {
    return this.redis.set(
      summaryKey(meetingId),
      summary,
      this.configService.getOrThrow<number>('FINISHED_MEETING_TTL_SECONDS'),
    );
  }

  touchAlive(meetingId: string): Promise<void> {
    return this.redis.set(
      aliveKey(meetingId),
      '1',
      this.configService.getOrThrow<number>('LIVE_MEETING_IDLE_SECONDS'),
    );
  }

  async isAlive(meetingId: string): Promise<boolean> {
    return (await this.redis.read(aliveKey(meetingId))) !== null;
  }

  claimSummarize(meetingId: string, ttlSeconds: number): Promise<boolean> {
    return this.redis.claim(summarizeLockKey(meetingId), ttlSeconds);
  }

  releaseSummarize(meetingId: string): Promise<void> {
    return this.redis.delete(summarizeLockKey(meetingId));
  }

  async expire(meetingId: string): Promise<void> {
    const ttl = this.configService.getOrThrow<number>('FINISHED_MEETING_TTL_SECONDS');

    await Promise.all([
      this.redis.expire(stateKey(meetingId), ttl),
      this.redis.expire(windowKey(meetingId), ttl),
      this.redis.expire(summaryKey(meetingId), ttl),
      this.redis.delete(aliveKey(meetingId)),
      this.redis.delete(screenshotKey(meetingId)),
    ]);
  }
}
