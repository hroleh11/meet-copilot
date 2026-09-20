import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Meeting } from '~/generated/prisma/client';
import { ProjectsService } from '~/modules/projects';
import { ResourcesService } from '~/modules/resources';
import { SettingsService } from '~/modules/settings';
import { UsageRepository } from '~/modules/usage';
import {
  MEETINGS_OUTSIDE_PROJECTS,
  type CreateMeetingDto,
  type ListMeetingsDto,
  type UpdateMeetingDto,
} from './dto/meetings.dto';
import type { MeetingDetailsResponse, MeetingResponse } from './dto/meetings.responses';
import { MeetingOverviewWriter } from './meeting-overview.writer';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsRepository } from './meetings.repository';
import { toDetailsResponse, toMeetingResponse } from './meetings.mapper';

const DEFAULT_PAGE = 20;
const DAY_LENGTH = 10;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly meetingStateStore: MeetingStateStore,
    private readonly overviewWriter: MeetingOverviewWriter,
    private readonly projectsService: ProjectsService,
    private readonly resourcesService: ResourcesService,
    private readonly settingsService: SettingsService,
    private readonly usageRepository: UsageRepository,
  ) {}

  async create(userId: string, dto: CreateMeetingDto): Promise<MeetingResponse> {
    if (dto.projectId) {
      await this.projectsService.requireOwned(userId, dto.projectId);
    }

    const { resourceIds, ...start } = dto;
    const settings = await this.settingsService.get(userId);
    const meeting = await this.meetingsRepository.create({ userId, ...start });

    await this.resourcesService.claimForMeeting(userId, meeting.id, resourceIds ?? []);

    const contextBrief = await this.resourcesService.briefFor(
      userId,
      meeting.projectId,
      meeting.id,
    );

    if (contextBrief) {
      await this.meetingsRepository.updateContextBrief(meeting.id, contextBrief);
    }

    await this.meetingStateStore.initialize(meeting.id, {
      language: meeting.language,
      replyLanguage: meeting.replyLanguage,
      profile: meeting.profile,
      style: settings.style ?? '',
      contextBrief: contextBrief ?? '',
      today: asDay(meeting.startedAt),
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
      projectId: asProjectFilter(query.projectId),
    });

    return meetings.map(toMeetingResponse);
  }

  async update(
    userId: string,
    meetingId: string,
    dto: UpdateMeetingDto,
  ): Promise<MeetingResponse> {
    const meeting = await this.requireOwned(userId, meetingId);

    if (dto.projectId) {
      await this.projectsService.requireOwned(userId, dto.projectId);
    }

    if (speaksDifferently(dto) && meeting.status !== 'live') {
      throw new ConflictException('This meeting is already finished');
    }

    const updated = await this.meetingsRepository.update(meeting.id, {
      ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
      ...(dto.projectId === undefined ? {} : { projectId: dto.projectId }),
      ...(dto.language === undefined ? {} : { language: dto.language }),
      ...(dto.replyLanguage === undefined ? {} : { replyLanguage: dto.replyLanguage }),
    });

    if (speaksDifferently(dto)) {
      await this.meetingStateStore.writeLanguage(
        updated.id,
        updated.language,
        updated.replyLanguage,
      );
    }

    return toMeetingResponse(updated);
  }

  async remove(userId: string, meetingId: string): Promise<void> {
    const meeting = await this.requireOwned(userId, meetingId);

    if (meeting.status === 'live') {
      throw new ConflictException('Finish the meeting before deleting it');
    }

    await this.meetingsRepository.delete(meeting.id);
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

/// Switching the language mid-meeting is what an interview that opens in one and
/// carries on in another needs. It only makes sense while the meeting is running,
/// because what it really does is send the recognition lanes to reopen.
function speaksDifferently(dto: UpdateMeetingDto): boolean {
  return dto.language !== undefined || dto.replyLanguage !== undefined;
}

function asDay(moment: Date): string {
  return moment.toISOString().slice(0, DAY_LENGTH);
}

function asProjectFilter(projectId?: string): string | null | undefined {
  if (projectId === undefined) {
    return undefined;
  }

  return projectId === MEETINGS_OUTSIDE_PROJECTS ? null : projectId;
}
