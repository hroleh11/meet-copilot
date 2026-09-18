import { describe, expect, it } from 'vitest';
import { estimateCost } from '~/features/history/cost';

describe('estimateCost', () => {
  it('is free when nothing was used', () => {
    expect(
      estimateCost({
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        audioSeconds: 0,
      }),
    ).toBe(0);
  });

  it('charges cached input less than fresh input', () => {
    const fresh = estimateCost({
      inputTokens: 1_000_000,
      cachedInputTokens: 0,
      outputTokens: 0,
      audioSeconds: 0,
    });

    const cached = estimateCost({
      inputTokens: 1_000_000,
      cachedInputTokens: 1_000_000,
      outputTokens: 0,
      audioSeconds: 0,
    });

    expect(cached).toBeLessThan(fresh);
  });

  it('counts the audio of both speakers', () => {
    const silent = estimateCost({
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      audioSeconds: 0,
    });

    const hour = estimateCost({
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      audioSeconds: 3_600,
    });

    expect(hour).toBeGreaterThan(silent);
  });
});
