import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MeetingDetailsPanel } from '~/features/history/MeetingDetailsPanel';
import type { MeetingDetails } from '~/shared/ipc';

const details = (over: Partial<MeetingDetails> = {}): MeetingDetails => ({
  id: 'm-1',
  profile: 'client_call',
  language: 'uk',
  title: 'Дзвінок з Acme',
  status: 'finished',
  startedAt: '2026-02-03T09:15:00.000Z',
  endedAt: '2026-02-03T09:45:00.000Z',
  summary: null,
  segments: [
    { id: 's-1', speaker: 'other', text: 'Які терміни?', startMs: 0, durationMs: 1200 },
  ],
  generations: [
    {
      id: 'g-1',
      mode: 'reply',
      output: 'Два тижні на перший етап.',
      createdAt: '2026-02-03T09:20:00.000Z',
    },
  ],
  usage: {
    inputTokens: 12_000,
    cachedInputTokens: 8_000,
    outputTokens: 900,
    audioSeconds: 1_800,
  },
  ...over,
});

describe('MeetingDetailsPanel', () => {
  it('shows the transcript and the answers of a past meeting', () => {
    render(<MeetingDetailsPanel details={details()} />);

    expect(screen.getByText('Які терміни?')).toBeInTheDocument();
    expect(screen.getByText('Два тижні на перший етап.')).toBeInTheDocument();
    expect(screen.getByText('Співрозмовник')).toBeInTheDocument();
  });

  it('reports what the meeting cost', () => {
    render(<MeetingDetailsPanel details={details()} />);

    expect(screen.getByText('Витрати')).toBeInTheDocument();
    expect(screen.getByText('30 хв 00 с')).toBeInTheDocument();
  });

  it('says when a meeting produced no answers', () => {
    render(<MeetingDetailsPanel details={details({ generations: [] })} />);

    expect(screen.getByText('Відповідей не було.')).toBeInTheDocument();
  });
});
