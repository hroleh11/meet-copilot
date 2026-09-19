import type { MeetingDetailsResponse } from '~/modules/meetings';
import { MeetingToolbox } from './meeting.toolbox';
import {
  LIST_ANSWERS,
  MEETING_FACTS,
  READ_TRANSCRIPT,
  SEARCH_TRANSCRIPT,
} from './meeting.tools';

const details: MeetingDetailsResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  profile: 'interview_candidate',
  language: 'uk',
  title: 'Співбесіда',
  status: 'finished',
  startedAt: new Date('2026-09-19T13:00:00.000Z'),
  endedAt: new Date('2026-09-19T13:27:30.000Z'),
  overview: 'Перевіряли знання JavaScript.',
  segments: [
    {
      id: 's1',
      speaker: 'other',
      text: 'Чим var відрізняється від let?',
      startMs: 0,
      durationMs: 4_000,
    },
    {
      id: 's2',
      speaker: 'me',
      text: 'Областю видимості.',
      startMs: 0,
      durationMs: 2_000,
    },
    {
      id: 's3',
      speaker: 'other',
      text: 'А замикання?',
      startMs: 4_000,
      durationMs: 1_000,
    },
  ],
  generations: [
    {
      id: 'g1',
      mode: 'reply',
      output: 'Замикання це функція з доступом до зовнішньої області.',
      createdAt: new Date('2026-09-19T13:10:00.000Z'),
    },
  ],
  usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, audioSeconds: 0 },
};

function run(name: string, args = '{}'): Record<string, unknown> {
  return JSON.parse(new MeetingToolbox(details).run(name, args)) as Record<
    string,
    unknown
  >;
}

describe('MeetingToolbox', () => {
  it('knows how long the meeting lasted and who spoke', () => {
    expect(run(MEETING_FACTS)).toMatchObject({
      durationSeconds: 1_650,
      speechSeconds: { me: 2, other: 5 },
      lines: { total: 3, me: 1, other: 2 },
      answersGenerated: 1,
    });
  });

  it('leaves the length open while the meeting is still running', () => {
    const live = new MeetingToolbox({ ...details, status: 'live', endedAt: null });

    expect(JSON.parse(live.run(MEETING_FACTS, '{}'))).toMatchObject({
      durationSeconds: null,
    });
  });

  it('finds a line and numbers it the way the transcript is read', () => {
    expect(run(SEARCH_TRANSCRIPT, JSON.stringify({ query: 'замикання' }))).toEqual({
      matches: 1,
      lines: [{ line: 3, speaker: 'other', text: 'А замикання?' }],
    });
  });

  it('reads a stretch from the line it was asked for', () => {
    expect(run(READ_TRANSCRIPT, JSON.stringify({ from: 2, count: 1 }))).toEqual({
      totalLines: 3,
      lines: [{ line: 2, speaker: 'me', text: 'Областю видимості.' }],
    });
  });

  it('gives back the answers made during the meeting', () => {
    expect(run(LIST_ANSWERS)).toMatchObject({
      answers: [{ mode: 'reply', createdAt: '2026-09-19T13:10:00.000Z' }],
    });
  });

  it('reports a tool it does not have and arguments it cannot read', () => {
    expect(run('delete_meeting')).toHaveProperty('error');
    expect(run(SEARCH_TRANSCRIPT, '{ broken')).toHaveProperty('error');
  });
});
