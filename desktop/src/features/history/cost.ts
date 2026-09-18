import type { Usage } from '~/shared/ipc';

const INPUT_USD_PER_MILLION = 1.25;
const CACHED_INPUT_USD_PER_MILLION = 0.13;
const OUTPUT_USD_PER_MILLION = 10;
const SPEECH_USD_PER_MINUTE = 0.0077;

const MILLION = 1_000_000;
const SECONDS_IN_MINUTE = 60;

export function estimateCost(usage: Usage): number {
  const freshInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);

  const tokens =
    (freshInput * INPUT_USD_PER_MILLION +
      usage.cachedInputTokens * CACHED_INPUT_USD_PER_MILLION +
      usage.outputTokens * OUTPUT_USD_PER_MILLION) /
    MILLION;

  const speech = (usage.audioSeconds / SECONDS_IN_MINUTE) * SPEECH_USD_PER_MINUTE;

  return tokens + speech;
}
