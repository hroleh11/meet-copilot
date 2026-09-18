import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/infrastructure/prisma';
import type { UsageRecord, UsageTotals } from './types/usage.types';

const EMPTY: UsageTotals = {
  inputTokens: 0,
  cachedInputTokens: 0,
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
        cachedInputTokens: record.cachedInputTokens ?? 0,
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
        cachedInputTokens: true,
        outputTokens: true,
        audioSeconds: true,
      },
    });

    return {
      inputTokens: totals._sum.inputTokens ?? EMPTY.inputTokens,
      cachedInputTokens: totals._sum.cachedInputTokens ?? EMPTY.cachedInputTokens,
      outputTokens: totals._sum.outputTokens ?? EMPTY.outputTokens,
      audioSeconds: totals._sum.audioSeconds ?? EMPTY.audioSeconds,
    };
  }
}
