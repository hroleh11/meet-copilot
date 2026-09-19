import type { LlmEffort, LlmUsage } from './llm.provider';

export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  callId: string;
  name: string;
  arguments: string;
}

export type LlmItem =
  | { kind: 'message'; role: 'user' | 'assistant'; text: string }
  | { kind: 'toolResult'; callId: string; output: string };

/// `continueFrom` is the handle the previous turn reported. The provider keeps the
/// reasoning of that turn behind it, so a tool result is sent on its own instead of
/// replaying the whole conversation.
export interface LlmAgentRequest {
  model: string;
  effort: LlmEffort;
  maxTokens: number;
  system: string;
  items: LlmItem[];
  tools: LlmTool[];
  continueFrom?: string;
}

export type LlmAgentEvent =
  | { type: 'delta'; text: string }
  | { type: 'toolCall'; call: LlmToolCall }
  | {
      type: 'done';
      handle: string | null;
      stopReason: string | null;
      usage: LlmUsage;
    };
