import type { Language } from '~/generated/prisma/enums';

export interface SttResult {
  text: string;
  isFinal: boolean;
  startMs: number;
  durationMs: number;
}

export interface SttStreamHandlers {
  onResult: (result: SttResult) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export interface SttStream {
  send(audio: Buffer): void;
  close(): Promise<void>;
}

export abstract class SttProvider {
  abstract open(language: Language, handlers: SttStreamHandlers): Promise<SttStream>;
}
