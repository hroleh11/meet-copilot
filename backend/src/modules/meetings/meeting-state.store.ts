import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { Language, MeetingProfile } from '~/generated/prisma/enums';
import { RedisService } from '~/infrastructure/redis';
import type {
  MeetingLiveState,
  MeetingTurn,
  WindowSegment,
} from './types/meetings.types';

const MAX_TURNS = 6;

const stateKey = (meetingId: string): string => `meeting:${meetingId}:state`;
const windowKey = (meetingId: string): string => `meeting:${meetingId}:window`;
const summaryKey = (meetingId: string): string => `meeting:${meetingId}:summary`;
const summarizeLockKey = (meetingId: string): string =>
  `meeting:${meetingId}:summarize:lock`;
const aliveKey = (meetingId: string): string => `meeting:${meetingId}:alive`;
const turnsKey = (meetingId: string): string => `meeting:${meetingId}:turns`;

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
      contextBrief: state.contextBrief,
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
      contextBrief: stored.contextBrief ?? '',
    };
  }

  async readSpokenUpTo(meetingId: string): Promise<string | null> {
    const stored = await this.redis.readHash(stateKey(meetingId));

    return stored.spokenUpTo ?? null;
  }

  writeSpokenUpTo(meetingId: string, segmentId: string): Promise<void> {
    return this.redis.writeHash(stateKey(meetingId), { spokenUpTo: segmentId });
  }

  async readTurns(meetingId: string): Promise<MeetingTurn[]> {
    const stored = await this.redis.read(turnsKey(meetingId));

    return stored === null ? [] : (JSON.parse(stored) as MeetingTurn[]);
  }

  async appendTurn(meetingId: string, turn: MeetingTurn): Promise<void> {
    const turns = [...(await this.readTurns(meetingId)), turn];

    await this.writeTurns(meetingId, withNewestScreenshotOnly(turns.slice(-MAX_TURNS)));
  }

  async replaceLastAnswer(meetingId: string, turn: MeetingTurn): Promise<void> {
    const turns = await this.readTurns(meetingId);
    const previous = turns.at(-1);
    const replaced = previous ? { ...previous, answer: turn.answer } : turn;

    await this.writeTurns(meetingId, [...turns.slice(0, -1), replaced]);
  }

  private writeTurns(meetingId: string, turns: MeetingTurn[]): Promise<void> {
    return this.redis.set(
      turnsKey(meetingId),
      JSON.stringify(turns),
      this.configService.getOrThrow<number>('FINISHED_MEETING_TTL_SECONDS'),
    );
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
      this.redis.delete(turnsKey(meetingId)),
    ]);
  }
}

function withNewestScreenshotOnly(turns: MeetingTurn[]): MeetingTurn[] {
  const newest = turns.findLastIndex((turn) => turn.screenshot);

  return turns.map((turn, index) =>
    index === newest ? turn : { question: turn.question, answer: turn.answer },
  );
}
