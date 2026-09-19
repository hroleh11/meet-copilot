import { Injectable, NotFoundException } from '@nestjs/common';
import type { Meeting } from '~/generated/prisma/client';
import { SettingsService } from '~/modules/settings';
import { UsageRepository } from '~/modules/usage';
import type { CreateMeetingDto, ListMeetingsDto } from './dto/meetings.dto';
import type { MeetingDetailsResponse, MeetingResponse } from './dto/meetings.responses';
import { MeetingOverviewWriter } from './meeting-overview.writer';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsRepository } from './meetings.repository';
import { toDetailsResponse, toMeetingResponse } from './meetings.mapper';

const DEFAULT_PAGE = 20;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly meetingStateStore: MeetingStateStore,
    private readonly overviewWriter: MeetingOverviewWriter,
    private readonly settingsService: SettingsService,
    private readonly usageRepository: UsageRepository,
  ) {}

  async create(userId: string, dto: CreateMeetingDto): Promise<MeetingResponse> {
    const settings = await this.settingsService.get(userId);
    const meeting = await this.meetingsRepository.create({ userId, ...dto });

    await this.meetingStateStore.initialize(meeting.id, {
      language: meeting.language,
      profile: meeting.profile,
      style: settings.style ?? '',
    });

    return toMeetingResponse(meeting);
  }

  async finish(userId: string, meetingId: string): Promise<MeetingResponse> {
    const meeting = await this.requireOwned(userId, meetingId);

    if (meeting.status === 'finished') {
      return toMeetingResponse(meeting);
    }

    const finished = await this.meetingsRepository.finish(meeting.id);
    await this.meetingStateStore.expire(meeting.id);
    void this.overviewWriter.prepare(userId, meeting.id);

    return toMeetingResponse(finished);
  }

  async list(userId: string, query: ListMeetingsDto): Promise<MeetingResponse[]> {
    const meetings = await this.meetingsRepository.listOwned(userId, {
      limit: query.limit ?? DEFAULT_PAGE,
      cursor: query.cursor,
    });

    return meetings.map(toMeetingResponse);
  }

  async details(userId: string, meetingId: string): Promise<MeetingDetailsResponse> {
    const meeting = await this.meetingsRepository.findOwnedWithContent(userId, meetingId);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const [usage, overview] = await Promise.all([
      this.usageRepository.totalsForMeeting(meeting.id),
      this.overviewWriter.ensure(meeting, userId),
    ]);

    return toDetailsResponse(meeting, usage, overview);
  }

  async requireOwned(userId: string, meetingId: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOwned(userId, meetingId);

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }
}
