import { describe, expect, it } from 'vitest';
import { meetingMeta } from '~/features/history/meetingMeta';
import type { Meeting } from '~/shared/ipc';

const meeting = (startedAt: Date, endedAt: Date | null): Meeting => ({
  id: 'm-1',
  projectId: null,
  profile: 'daily',
  language: 'uk',
  replyLanguage: null,
  title: null,
  status: endedAt ? 'finished' : 'live',
  startedAt: startedAt.toISOString(),
  endedAt: endedAt?.toISOString() ?? null,
});

describe('meetingMeta', () => {
  it('calls today by its name', () => {
    const now = new Date('2026-02-03T18:00:00');
    const started = new Date('2026-02-03T09:00:00');

    expect(meetingMeta(meeting(started, new Date('2026-02-03T09:14:00')), now)).toContain(
      'Сьогодні',
    );
  });

  it('calls yesterday by its name', () => {
    const now = new Date('2026-02-03T18:00:00');
    const started = new Date('2026-02-02T15:30:00');

    expect(meetingMeta(meeting(started, new Date('2026-02-02T16:12:00')), now)).toContain(
      'Вчора',
    );
  });

  it('counts the minutes a meeting lasted', () => {
    const now = new Date('2026-02-03T18:00:00');
    const started = new Date('2026-02-03T09:00:00');

    expect(meetingMeta(meeting(started, new Date('2026-02-03T09:28:00')), now)).toContain(
      '28 хв',
    );
  });

  it('says a meeting is still running', () => {
    const now = new Date('2026-02-03T18:00:00');

    expect(meetingMeta(meeting(new Date('2026-02-03T17:50:00'), null), now)).toContain(
      'Триває',
    );
  });
});
