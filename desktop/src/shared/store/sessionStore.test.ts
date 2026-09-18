import { beforeEach, describe, expect, it } from 'vitest';
import { merge, useSessionStore, type TranscriptLine } from './sessionStore';

const interim = (speaker: TranscriptLine['speaker'], text: string): TranscriptLine => ({
  id: `interim-${speaker}`,
  speaker,
  text,
  isFinal: false,
});

const final = (
  id: string,
  speaker: TranscriptLine['speaker'],
  text: string,
): TranscriptLine => ({
  id,
  speaker,
  text,
  isFinal: true,
});

describe('merge', () => {
  it('appends the first line', () => {
    expect(merge([], interim('me', 'приві'))).toEqual([interim('me', 'приві')]);
  });

  it('replaces an interim line in place as it grows', () => {
    const lines = merge([interim('me', 'приві')], interim('me', 'привіт усім'));

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe('привіт усім');
  });

  it('drops the interim line once the final one arrives', () => {
    const lines = merge([interim('me', 'приві')], final('seg-1', 'me', 'Привіт усім.'));

    expect(lines).toEqual([final('seg-1', 'me', 'Привіт усім.')]);
  });

  it('leaves the other speaker mid-sentence alone', () => {
    const started = merge([interim('other', 'що можна')], interim('me', 'я думаю'));
    const lines = merge(started, final('seg-1', 'me', 'Я думаю, варто.'));

    expect(lines).toEqual([
      interim('other', 'що можна'),
      final('seg-1', 'me', 'Я думаю, варто.'),
    ]);
  });

  it('keeps finished lines in the order they were spoken', () => {
    const lines = [
      final('seg-1', 'other', 'Перше.'),
      final('seg-2', 'me', 'Друге.'),
      final('seg-3', 'other', 'Третє.'),
    ].reduce(merge, [] as TranscriptLine[]);

    expect(lines.map((line) => line.id)).toEqual(['seg-1', 'seg-2', 'seg-3']);
  });
});

describe('source statuses', () => {
  beforeEach(() => {
    useSessionStore.getState().setState('listening', 'm-1', null);
  });

  it('keeps one status per source', () => {
    const store = useSessionStore.getState();

    store.setSource({ speaker: 'other', active: false });
    store.setSource({ speaker: 'other', active: true });

    expect(useSessionStore.getState().sources).toEqual([
      { speaker: 'other', active: true },
    ]);
  });

  it('forgets the sources once the meeting is over', () => {
    const store = useSessionStore.getState();

    store.setSource({ speaker: 'me', active: true });
    store.setState('idle', null, null);

    expect(useSessionStore.getState().sources).toEqual([]);
  });
});
