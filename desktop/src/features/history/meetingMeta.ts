import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';

const TIME = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const WEEKDAY = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });
const DATE = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' });

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const MINUTE_MS = 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function describeDay(started: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(started)) / DAY_MS);

  if (days <= 0) {
    return uk.history.today;
  }

  if (days === 1) {
    return uk.history.yesterday;
  }

  return days < WEEK_DAYS ? WEEKDAY.format(started) : DATE.format(started);
}

export function meetingMeta(meeting: Meeting, now = new Date()): string {
  const started = new Date(meeting.startedAt);
  const when = `${describeDay(started, now)}, ${TIME.format(started)}`;

  if (!meeting.endedAt) {
    return `${when} · ${uk.history.live}`;
  }

  const minutes = Math.max(
    1,
    Math.round((new Date(meeting.endedAt).getTime() - started.getTime()) / MINUTE_MS),
  );

  return `${when} · ${minutes} ${uk.history.minutes}`;
}
