import type { LlmAgentEvent, LlmAgentRequest } from './llm.agent';

export type LlmEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface LlmUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export interface LlmImage {
  mimeType: string;
  dataBase64: string;
}

export interface LlmRequest {
  model: string;
  effort: LlmEffort;
  maxTokens: number;
  system: string;
  blocks: string[];
  image?: LlmImage;
}

export interface LlmCompletion {
  text: string;
  stopReason: string | null;
  usage: LlmUsage;
}

export type LlmEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; stopReason: string | null; usage: LlmUsage };

export abstract class LlmProvider {
  abstract complete(request: LlmRequest): Promise<LlmCompletion>;

  abstract stream(request: LlmRequest, signal: AbortSignal): AsyncIterable<LlmEvent>;

  abstract streamTools(
    request: LlmAgentRequest,
    signal: AbortSignal,
  ): AsyncIterable<LlmAgentEvent>;
}
