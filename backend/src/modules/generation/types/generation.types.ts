import type { LlmUsage } from '~/infrastructure/llm';

export interface GenerationDone {
  generationId: string;
  stopReason: string | null;
  usage: LlmUsage;
}

export type GenerationEvent =
  | { type: 'delta'; data: { text: string } }
  | { type: 'done'; data: GenerationDone }
  | { type: 'error'; data: { message: string } };
