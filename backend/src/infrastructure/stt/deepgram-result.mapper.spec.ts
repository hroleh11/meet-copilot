import { toSttResult } from './deepgram-result.mapper';

function results(transcript: string, isFinal = true): unknown {
  return {
    type: 'Results',
    start: 1.25,
    duration: 0.5,
    is_final: isFinal,
    channel: { alternatives: [{ transcript }] },
  };
}

describe('toSttResult', () => {
  it('converts seconds to milliseconds', () => {
    expect(toSttResult(results('привіт'))).toEqual({
      text: 'привіт',
      isFinal: true,
      startMs: 1250,
      durationMs: 500,
    });
  });

  it('drops messages that carry no words', () => {
    expect(toSttResult(results('   '))).toBeNull();
  });

  it('ignores metadata and other message types', () => {
    expect(toSttResult({ type: 'Metadata' })).toBeNull();
  });

  it('marks interim results as not final', () => {
    expect(toSttResult(results('приві', false))?.isFinal).toBe(false);
  });
});
