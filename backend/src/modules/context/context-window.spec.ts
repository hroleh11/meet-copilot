import type { WindowSegment } from '~/modules/meetings';
import { segmentsAfter, splitByBudget } from './context-window';

const segment = (id: string, text: string): WindowSegment => ({
  id,
  speaker: 'me',
  text,
  startMs: 0,
  durationMs: 0,
});

describe('splitByBudget', () => {
  it('keeps everything when the transcript fits', () => {
    const segments = [segment('a', 'one'), segment('b', 'two')];

    expect(splitByBudget(segments, 100)).toEqual({ recent: segments, stale: [] });
  });

  it('keeps the newest segments and stales the older ones', () => {
    const segments = [
      segment('a', 'x'.repeat(40)),
      segment('b', 'y'.repeat(40)),
      segment('c', 'z'.repeat(40)),
    ];

    const { recent, stale } = splitByBudget(segments, 80);

    expect(stale.map((s) => s.id)).toEqual(['a']);
    expect(recent.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('preserves the order segments arrived in', () => {
    const segments = ['a', 'b', 'c', 'd'].map((id) => segment(id, 'x'.repeat(30)));

    const { recent, stale } = splitByBudget(segments, 60);

    expect([...stale, ...recent].map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never drops the newest segment even when it alone busts the budget', () => {
    const segments = [segment('a', 'x'.repeat(10)), segment('b', 'y'.repeat(500))];

    const { recent, stale } = splitByBudget(segments, 50);

    expect(recent.map((s) => s.id)).toEqual(['b']);
    expect(stale.map((s) => s.id)).toEqual(['a']);
  });

  it('handles an empty window', () => {
    expect(splitByBudget([], 100)).toEqual({ recent: [], stale: [] });
  });
});

describe('segmentsAfter', () => {
  const segments = [segment('a', 'one'), segment('b', 'two'), segment('c', 'three')];

  it('keeps only what was said after the marked segment', () => {
    expect(segmentsAfter(segments, 'a').map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('finds nothing new when the marker is the newest segment', () => {
    expect(segmentsAfter(segments, 'c')).toEqual([]);
  });

  it('treats the whole window as new when nothing was marked yet', () => {
    expect(segmentsAfter(segments, null)).toEqual(segments);
  });

  it('falls back to the whole window when the marker was summarized away', () => {
    expect(segmentsAfter(segments, 'gone')).toEqual(segments);
  });
});
