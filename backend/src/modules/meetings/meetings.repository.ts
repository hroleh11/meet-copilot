import { Injectable } from '@nestjs/common';
import type { Generation, Meeting, Resource, Segment } from '~/generated/prisma/client';
import type { Language, MeetingProfile, Speaker } from '~/generated/prisma/enums';
import { PrismaService } from '~/infrastructure/prisma';

export type MeetingWithContent = Meeting & {
  segments: Segment[];
  generations: Generation[];
  resources: Resource[];
};

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    profile: MeetingProfile;
    language: Language;
    title?: string;
    projectId?: string;
  }): Promise<Meeting> {
    return this.prisma.meeting.create({
      data: {
        userId: data.userId,
        profile: data.profile,
        language: data.language,
        title: data.title ?? null,
        projectId: data.projectId ?? null,
      },
    });
  }

  findOwned(userId: string, meetingId: string): Promise<Meeting | null> {
    return this.prisma.meeting.findFirst({ where: { id: meetingId, userId } });
  }

  findOwnedWithContent(
    userId: string,
    meetingId: string,
  ): Promise<MeetingWithContent | null> {
    return this.prisma.meeting.findFirst({
      where: { id: meetingId, userId },
      include: {
        segments: { orderBy: { startMs: 'asc' } },
        generations: { orderBy: { createdAt: 'asc' } },
        resources: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  listOwned(
    userId: string,
    page: { limit: number; cursor?: string; projectId?: string | null },
  ): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: {
        userId,
        ...(page.projectId === undefined ? {} : { projectId: page.projectId }),
      },
      orderBy: { startedAt: 'desc' },
      take: page.limit,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
  }

  listLiveStartedBefore(startedBefore: Date): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: { status: 'live', startedAt: { lt: startedBefore } },
      orderBy: { startedAt: 'asc' },
    });
  }

  appendSegment(data: {
    meetingId: string;
    speaker: Speaker;
    text: string;
    startMs: number;
    durationMs: number;
  }): Promise<Segment> {
    return this.prisma.segment.create({ data });
  }

  async updateSummary(meetingId: string, summary: string): Promise<void> {
    await this.prisma.meeting.update({ where: { id: meetingId }, data: { summary } });
  }

  async updateContextBrief(meetingId: string, contextBrief: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { contextBrief },
    });
  }

  async updateOverview(meetingId: string, overview: string): Promise<void> {
    await this.prisma.meeting.update({ where: { id: meetingId }, data: { overview } });
  }

  update(
    meetingId: string,
    data: { title?: string; projectId?: string | null },
  ): Promise<Meeting> {
    return this.prisma.meeting.update({ where: { id: meetingId }, data });
  }

  async delete(meetingId: string): Promise<void> {
    await this.prisma.meeting.delete({ where: { id: meetingId } });
  }

  finish(meetingId: string): Promise<Meeting> {
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'finished', endedAt: new Date() },
    });
  }
}
