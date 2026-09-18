import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Env } from '~/common/config';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsRepository } from './meetings.repository';

const MILLISECONDS = 1_000;

@Injectable()
export class StaleMeetingsCloser {
  private readonly logger = new Logger(StaleMeetingsCloser.name);

  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly meetingStateStore: MeetingStateStore,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run(): Promise<number> {
    const idleSeconds = this.configService.getOrThrow<number>(
      'LIVE_MEETING_IDLE_SECONDS',
    );
    const startedBefore = new Date(Date.now() - idleSeconds * MILLISECONDS);
    const candidates = await this.meetingsRepository.listLiveStartedBefore(startedBefore);

    let closed = 0;

    for (const meeting of candidates) {
      if (await this.meetingStateStore.isAlive(meeting.id)) {
        continue;
      }

      await this.meetingsRepository.finish(meeting.id);
      await this.meetingStateStore.expire(meeting.id);
      closed += 1;
    }

    if (closed > 0) {
      this.logger.log(`Finished ${closed} meetings nobody was streaming to`);
    }

    return closed;
  }
}
