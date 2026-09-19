import type { LlmUsage } from '~/infrastructure/llm';

export interface ChatDone {
  messageId: string;
  stopReason: string | null;
  usage: LlmUsage;
}

export type ChatEvent =
  | { type: 'delta'; data: { text: string } }
  | { type: 'done'; data: ChatDone }
  | { type: 'error'; data: { message: string } };

export type AgentEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; model: string; stopReason: string | null; usage: LlmUsage };
