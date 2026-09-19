import type {
  BackendFailure,
  ErrorKind,
  GenerationMode,
  Profile,
  SessionState,
  Speaker,
  TokenUsage,
} from './types';

export const APP_EVENT = {
  authState: 'auth:state',
  sessionState: 'session:state',
  audioLevel: 'audio:level',
  transcriptSegment: 'transcript:segment',
  sourceStatus: 'source:status',
  generationStarted: 'generation:started',
  generationDelta: 'generation:delta',
  generationFinished: 'generation:finished',
  generationFailed: 'generation:failed',
  chatDelta: 'chat:delta',
  chatFinished: 'chat:finished',
  chatFailed: 'chat:failed',
  overlayInteraction: 'overlay:interaction',
  appError: 'app:error',
} as const;

export interface ChatDeltaEvent {
  chatId: string;
  text: string;
}

export interface ChatFinishedEvent {
  chatId: string;
  messageId: string;
}

export interface ChatFailedEvent {
  chatId: string;
  message: string;
}

export interface OverlayInteractionEvent {
  interactive: boolean;
}

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

export interface SourceStatusEvent {
  speaker: Speaker;
  active: boolean;
}

export interface GenerationStartedEvent {
  mode: GenerationMode;
  withScreenshot: boolean;
}

export interface GenerationDeltaEvent {
  text: string;
}

export interface GenerationFinishedEvent {
  generationId: string;
  usage: TokenUsage;
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
  [APP_EVENT.sourceStatus]: SourceStatusEvent;
  [APP_EVENT.generationStarted]: GenerationStartedEvent;
  [APP_EVENT.generationDelta]: GenerationDeltaEvent;
  [APP_EVENT.generationFinished]: GenerationFinishedEvent;
  [APP_EVENT.generationFailed]: GenerationFailedEvent;
  [APP_EVENT.appError]: AppErrorEvent;
}

export type AppEventName = keyof AppEventPayloads;
