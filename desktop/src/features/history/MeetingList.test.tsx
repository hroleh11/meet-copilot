import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MeetingList } from '~/features/history/MeetingList';
import type { Meeting } from '~/shared/ipc';

const meeting = (over: Partial<Meeting> = {}): Meeting => ({
  id: 'm-1',
  profile: 'daily',
  language: 'uk',
  title: null,
  status: 'finished',
  startedAt: '2026-02-03T09:15:00.000Z',
  endedAt: '2026-02-03T09:45:00.000Z',
  ...over,
});

describe('MeetingList', () => {
  it('names a meeting without a title by its profile', () => {
    render(
      <MeetingList meetings={[meeting()]} selectedId={null} onSelect={() => undefined} />,
    );

    expect(screen.getByText('Дейлі')).toBeInTheDocument();
  });

  it('marks a meeting that is still running', () => {
    render(
      <MeetingList
        meetings={[meeting({ status: 'live', endedAt: null })]}
        selectedId={null}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText(/Триває/)).toBeInTheDocument();
  });

  it('asks for the meeting the user clicked', () => {
    const onSelect = vi.fn();
    render(
      <MeetingList
        meetings={[meeting({ id: 'm-7', title: 'Співбесіда' })]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Співбесіда/ }));

    expect(onSelect).toHaveBeenCalledWith('m-7');
  });
});
