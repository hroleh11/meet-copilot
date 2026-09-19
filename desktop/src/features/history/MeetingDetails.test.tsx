import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MeetingDetails } from '~/features/history/MeetingDetails';
import type { MeetingDetails as Details } from '~/shared/ipc';

const details = (over: Partial<Details> = {}): Details => ({
  id: 'm-1',
  projectId: null,
  profile: 'client_call',
  language: 'uk',
  title: 'Дзвінок з Acme',
  status: 'finished',
  startedAt: '2026-02-03T09:15:00.000Z',
  endedAt: '2026-02-03T09:45:00.000Z',
  overview: 'Домовились про терміни першого етапу.',
  segments: [
    { id: 's-1', speaker: 'other', text: 'Які терміни?', startMs: 0, durationMs: 1200 },
  ],
  generations: [
    {
      id: 'g-1',
      mode: 'reply',
      output: 'Два тижні на перший етап.',
      hasScreenshot: true,
      createdAt: '2026-02-03T09:20:00.000Z',
    },
  ],
  resources: [],
  usage: {
    inputTokens: 12_000,
    cachedInputTokens: 8_000,
    outputTokens: 900,
    audioSeconds: 1_800,
  },
  ...over,
});

describe('MeetingDetails', () => {
  it('keeps the transcript and the answers in cards of their own', () => {
    render(<MeetingDetails details={details()} />);

    const cards = screen
      .getAllByRole('heading', { level: 2 })
      .map((card) => card.textContent);

    expect(cards).toEqual(['Дзвінок з Acme', 'Транскрипт', 'Відповіді', 'Витрати']);
    expect(screen.getByText('Які терміни?')).toBeInTheDocument();
    expect(screen.getByText('Два тижні на перший етап.')).toBeInTheDocument();
  });

  it('shows the short overview of the meeting', () => {
    render(<MeetingDetails details={details()} />);

    expect(screen.getByText('Домовились про терміни першого етапу.')).toBeInTheDocument();
  });

  it('says the overview is still coming when there is none', () => {
    render(<MeetingDetails details={details({ overview: null })} />);

    expect(
      screen.getByText('Резюме з’явиться після завершення зустрічі.'),
    ).toBeInTheDocument();
  });

  it('reports what the meeting cost', () => {
    render(<MeetingDetails details={details()} />);

    expect(screen.getByText('30 хв 00 с')).toBeInTheDocument();
  });

  it('marks an answer that was drafted from a screenshot', () => {
    render(<MeetingDetails details={details()} />);

    expect(screen.getByText(/зі знімком екрана/)).toBeInTheDocument();
  });

  it('says when a meeting produced no answers', () => {
    render(<MeetingDetails details={details({ generations: [] })} />);

    expect(screen.getByText('Відповідей не було.')).toBeInTheDocument();
  });
});
