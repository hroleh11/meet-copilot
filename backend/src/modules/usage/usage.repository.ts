import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/infrastructure/prisma';
import type { UsageRecord, UsageTotals } from './types/usage.types';

const EMPTY: UsageTotals = {
  inputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  outputTokens: 0,
  audioSeconds: 0,
};

@Injectable()
export class UsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: UsageRecord): Promise<void> {
    await this.prisma.usageEvent.create({
      data: {
        userId: record.userId,
        meetingId: record.meetingId ?? null,
        kind: record.kind,
        model: record.model ?? null,
        inputTokens: record.inputTokens ?? 0,
        cacheReadTokens: record.cacheReadTokens ?? 0,
        cacheCreationTokens: record.cacheCreationTokens ?? 0,
        outputTokens: record.outputTokens ?? 0,
        audioSeconds: record.audioSeconds ?? 0,
      },
    });
  }

  async totalsForMeeting(meetingId: string): Promise<UsageTotals> {
    const totals = await this.prisma.usageEvent.aggregate({
      where: { meetingId },
      _sum: {
        inputTokens: true,
        cacheReadTokens: true,
        cacheCreationTokens: true,
        outputTokens: true,
        audioSeconds: true,
      },
    });

    return {
      inputTokens: totals._sum.inputTokens ?? EMPTY.inputTokens,
      cacheReadTokens: totals._sum.cacheReadTokens ?? EMPTY.cacheReadTokens,
      cacheCreationTokens: totals._sum.cacheCreationTokens ?? EMPTY.cacheCreationTokens,
      outputTokens: totals._sum.outputTokens ?? EMPTY.outputTokens,
      audioSeconds: totals._sum.audioSeconds ?? EMPTY.audioSeconds,
    };
  }
}
