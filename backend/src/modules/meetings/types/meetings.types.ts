import type { Language, MeetingProfile, Speaker } from '~/generated/prisma/enums';

export interface MeetingLiveState {
  language: Language;
  profile: MeetingProfile;
  style: string;
  contextBrief: string;
  today: string;
}

export interface MeetingScreenshot {
  mimeType: string;
  dataBase64: string;
}

export interface MeetingTurn {
  question: string;
  answer: string;
  screenshot?: MeetingScreenshot;
}

export interface WindowSegment {
  id: string;
  speaker: Speaker;
  text: string;
  startMs: number;
  durationMs: number;
}
