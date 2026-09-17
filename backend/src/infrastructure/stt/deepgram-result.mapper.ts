import type { SttResult } from './stt.provider';

interface DeepgramMessage {
  type?: string;
  start?: number;
  duration?: number;
  is_final?: boolean;
  channel?: { alternatives?: { transcript?: string }[] };
}

export function toSttResult(message: unknown): SttResult | null {
  const payload = message as DeepgramMessage;

  if (payload.type !== 'Results') {
    return null;
  }

  const text = payload.channel?.alternatives?.[0]?.transcript?.trim() ?? '';

  if (!text) {
    return null;
  }

  return {
    text,
    isFinal: payload.is_final === true,
    startMs: Math.round((payload.start ?? 0) * 1000),
    durationMs: Math.round((payload.duration ?? 0) * 1000),
  };
}
