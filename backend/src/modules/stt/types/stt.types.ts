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
  finished: 1000,
  unauthorized: 4401,
  notFound: 4404,
  failed: 4500,
} as const;

export const STT_FINISH_REQUEST = 'finish';

export interface SttFinishRequest {
  type: typeof STT_FINISH_REQUEST;
}
