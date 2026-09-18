export type LlmEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface LlmUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export interface LlmRequest {
  model: string;
  effort: LlmEffort;
  maxTokens: number;
  system: string;
  blocks: string[];
}

export interface LlmCompletion {
  text: string;
  stopReason: string | null;
  usage: LlmUsage;
}

export abstract class LlmProvider {
  abstract complete(request: LlmRequest): Promise<LlmCompletion>;
}
