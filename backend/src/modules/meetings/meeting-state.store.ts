import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { Language, MeetingProfile } from '~/generated/prisma/enums';
import { RedisService } from '~/infrastructure/redis';
import type { MeetingLiveState } from './types/meetings.types';

const stateKey = (meetingId: string): string => `meeting:${meetingId}:state`;

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

  expire(meetingId: string): Promise<void> {
    return this.redis.expire(
      stateKey(meetingId),
      this.configService.getOrThrow<number>('FINISHED_MEETING_TTL_SECONDS'),
    );
  }
}
