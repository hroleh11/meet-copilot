export type Language = 'uk' | 'en' | 'ru';
export type MeetingProfile = 'daily' | 'interview_candidate' | 'client_call';
export type MeetingStatus = 'live' | 'finished';
export type Speaker = 'me' | 'other';
export type GenerationMode = 'reply' | 'alternative';
export type SessionState = 'idle' | 'starting' | 'listening' | 'stopping';

export interface Profile {
  id: string;
  email: string;
  name: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface Usage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  audioSeconds: number;
}

export interface Meeting {
  id: string;
  profile: MeetingProfile;
  language: Language;
  title: string | null;
  status: MeetingStatus;
  startedAt: string;
  endedAt: string | null;
}

export interface TranscriptSegment {
  id: string;
  speaker: Speaker;
  text: string;
  startMs: number;
  durationMs: number;
}

export interface Generation {
  id: string;
  mode: GenerationMode;
  output: string;
  createdAt: string;
}

export interface MeetingDetails extends Meeting {
  summary: string | null;
  segments: TranscriptSegment[];
  generations: Generation[];
  usage: Usage;
}

export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export interface UserSettings {
  style: string | null;
  defaultLanguage: Language;
  defaultProfile: MeetingProfile;
}

export interface Hotkeys {
  reply: string;
  alternative: string;
  hide: string;
}

export interface LocalSettings {
  backendUrl: string;
  inputDevice: string | null;
  hotkeys: Hotkeys;
}

export type ErrorKind =
  'audio' | 'backend' | 'settings' | 'permission' | 'access' | 'cancelled';

export type BackendFailure =
  'unauthorized' | 'notFound' | 'conflict' | 'unavailable' | 'unexpected';

export interface CommandError {
  kind: ErrorKind;
  failure: BackendFailure | null;
  message: string;
}
