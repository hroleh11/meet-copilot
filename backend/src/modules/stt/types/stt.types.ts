import type { Language, Speaker } from '~/generated/prisma/enums';

export interface SttSessionContext {
  userId: string;
  meetingId: string;
  language: Language;
  speaker: Speaker;
}

export type SttClientMessage =
  | {
      type: 'partial' | 'final';
      id: string;
      speaker: Speaker;
      text: string;
      startMs: number;
      durationMs: number;
    }
  | { type: 'error'; message: string };

export const STT_CLOSE_CODE = {
  unauthorized: 4401,
  notFound: 4404,
  failed: 4500,
} as const;
