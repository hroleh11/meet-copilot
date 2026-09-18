import type {
  BackendFailure,
  ErrorKind,
  GenerationMode,
  Profile,
  SessionState,
  Speaker,
  Usage,
} from './types';

export const APP_EVENT = {
  authState: 'auth:state',
  sessionState: 'session:state',
  audioLevel: 'audio:level',
  transcriptSegment: 'transcript:segment',
  generationStarted: 'generation:started',
  generationDelta: 'generation:delta',
  generationFinished: 'generation:finished',
  generationFailed: 'generation:failed',
  appError: 'app:error',
} as const;

export interface AuthStateEvent {
  signedIn: boolean;
  profile: Profile | null;
}

export interface SessionStateEvent {
  state: SessionState;
  meetingId: string | null;
  message: string | null;
}

export interface AudioLevelEvent {
  speaker: Speaker;
  level: number;
}

export interface TranscriptSegmentEvent {
  id: string;
  speaker: Speaker;
  text: string;
  isFinal: boolean;
}

export interface GenerationStartedEvent {
  mode: GenerationMode;
}

export interface GenerationDeltaEvent {
  text: string;
}

export interface GenerationFinishedEvent {
  generationId: string;
  usage: Usage;
}

export interface GenerationFailedEvent {
  message: string;
}

export interface AppErrorEvent {
  kind: ErrorKind;
  failure: BackendFailure | null;
  message: string;
}

export interface AppEventPayloads {
  [APP_EVENT.authState]: AuthStateEvent;
  [APP_EVENT.sessionState]: SessionStateEvent;
  [APP_EVENT.audioLevel]: AudioLevelEvent;
  [APP_EVENT.transcriptSegment]: TranscriptSegmentEvent;
  [APP_EVENT.generationStarted]: GenerationStartedEvent;
  [APP_EVENT.generationDelta]: GenerationDeltaEvent;
  [APP_EVENT.generationFinished]: GenerationFinishedEvent;
  [APP_EVENT.generationFailed]: GenerationFailedEvent;
  [APP_EVENT.appError]: AppErrorEvent;
}

export type AppEventName = keyof AppEventPayloads;
