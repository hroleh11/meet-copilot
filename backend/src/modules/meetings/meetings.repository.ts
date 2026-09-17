import { Injectable } from '@nestjs/common';
import type { Generation, Meeting, Segment } from '~/generated/prisma/client';
import type { Language, MeetingProfile, Speaker } from '~/generated/prisma/enums';
import { PrismaService } from '~/infrastructure/prisma';

export type MeetingWithContent = Meeting & {
  segments: Segment[];
  generations: Generation[];
};

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    profile: MeetingProfile;
    language: Language;
    title?: string;
  }): Promise<Meeting> {
    return this.prisma.meeting.create({
      data: {
        userId: data.userId,
        profile: data.profile,
        language: data.language,
        title: data.title ?? null,
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
      },
    });
  }

  listOwned(userId: string): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
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

  finish(meetingId: string): Promise<Meeting> {
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'finished', endedAt: new Date() },
    });
  }
}
