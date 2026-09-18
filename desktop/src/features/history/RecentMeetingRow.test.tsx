import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentMeetingRow } from '~/features/history/RecentMeetingRow';
import type { Meeting } from '~/shared/ipc';

const meeting = (over: Partial<Meeting> = {}): Meeting => ({
  id: 'm-1',
  profile: 'interview_candidate',
  language: 'uk',
  title: 'Frontend Developer — 2 етап',
  status: 'finished',
  startedAt: new Date('2026-02-03T09:00:00.000Z').toISOString(),
  endedAt: new Date('2026-02-03T09:42:00.000Z').toISOString(),
  ...over,
});

describe('RecentMeetingRow', () => {
  it('shows the profile chip, the title and how long it ran', () => {
    render(<RecentMeetingRow meeting={meeting()} onOpen={() => undefined} />);

    expect(screen.getByText('Співбесіда')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer — 2 етап')).toBeInTheDocument();
    expect(screen.getByText(/42 хв/)).toBeInTheDocument();
  });

  it('falls back to the profile when a meeting has no title', () => {
    render(
      <RecentMeetingRow
        meeting={meeting({ title: null, profile: 'daily' })}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getAllByText('Дейлі')).toHaveLength(2);
  });

  it('opens the meeting it was clicked on', () => {
    const onOpen = vi.fn();
    render(<RecentMeetingRow meeting={meeting({ id: 'm-7' })} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onOpen).toHaveBeenCalledWith('m-7');
  });
});
