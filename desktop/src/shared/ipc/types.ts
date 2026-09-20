export type Language = 'uk' | 'en' | 'ru';
export type MeetingProfile = 'daily' | 'interview_candidate' | 'client_call';
export type MeetingStatus = 'live' | 'finished';
export type Speaker = 'me' | 'other';
export type AudioPermission = 'microphone' | 'systemAudio';
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
  bluetooth: boolean;
}

export interface ChatSession {
  id: string;
  title: string | null;
  messageCount: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface Usage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  audioSeconds: number;
}

export interface Project {
  id: string;
  name: string;
  meetingCount: number;
  createdAt: string;
  updatedAt: string;
}

/// Which meetings the list asks for. Mirrors the adjacently tagged Rust enum,
/// so a project scope carries its id under `id`.
export type MeetingScope =
  { kind: 'all' } | { kind: 'outside' } | { kind: 'project'; id: string };

export type ResourceKind = 'pdf' | 'markdown' | 'text';
export type ResourceStatus = 'pending' | 'ready' | 'failed';
export type ResourceFailure = 'unreadable' | 'no_text_layer' | 'storage';

/// Which of the three levels a material belongs to. Mirrors the adjacently tagged
/// Rust enum; a meeting material has no id until the meeting claims it at start.
export type ResourceScope =
  | { kind: 'user' }
  | { kind: 'project'; id: string }
  | { kind: 'meeting'; id: string | null };

export interface Resource {
  id: string;
  projectId: string | null;
  meetingId: string | null;
  kind: ResourceKind;
  name: string;
  byteSize: number;
  status: ResourceStatus;
  failure: ResourceFailure | null;
  createdAt: string;
}

export interface ResourceContent {
  name: string;
  text: string | null;
  digest: string | null;
  chars: number;
}

export interface ResourceLimits {
  maxBytes: number;
  maxTextChars: number;
}

export interface MeetingStart {
  profile: MeetingProfile;
  language: Language;
  replyLanguage: Language | null;
  projectId: string | null;
  resourceIds: string[];
}

export interface Meeting {
  id: string;
  projectId: string | null;
  profile: MeetingProfile;
  language: Language;
  replyLanguage: Language | null;
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
  hasScreenshot: boolean;
  createdAt: string;
}

export interface MeetingDetails extends Meeting {
  overview: string | null;
  segments: TranscriptSegment[];
  generations: Generation[];
  resources: Resource[];
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
  screenshot: string;
  hide: string;
  interact: string;
}

export interface LocalSettings {
  backendUrl: string;
  inputDevice: string | null;
  hotkeys: Hotkeys;
}

export type ErrorKind =
  | 'audio'
  | 'backend'
  | 'settings'
  | 'permission'
  | 'access'
  | 'resource'
  | 'screen'
  | 'session'
  | 'cancelled'
  | 'window';

export type BackendFailure =
  'unauthorized' | 'notFound' | 'conflict' | 'unavailable' | 'unexpected';

export interface CommandError {
  kind: ErrorKind;
  failure: BackendFailure | null;
  message: string;
}
