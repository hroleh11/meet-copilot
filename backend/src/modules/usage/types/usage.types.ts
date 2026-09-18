import type { UsageKind } from '~/generated/prisma/enums';

export interface UsageTotals {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  audioSeconds: number;
}

export interface UsageRecord extends Partial<UsageTotals> {
  userId: string;
  meetingId?: string | null;
  kind: UsageKind;
  model?: string | null;
}
