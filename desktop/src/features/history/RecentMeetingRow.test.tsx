import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentMeetingRow } from '~/features/history/RecentMeetingRow';
import type { RecentMeetingRowProps } from '~/features/history/RecentMeetingRow';
import type { Meeting } from '~/shared/ipc';
import { MEETING_DRAG_TYPE } from '~/shared/lib/meetingDrag';

const meeting = (over: Partial<Meeting> = {}): Meeting => ({
  id: 'm-1',
  projectId: null,
  profile: 'interview_candidate',
  language: 'uk',
  title: 'Frontend Developer — 2 етап',
  status: 'finished',
  startedAt: new Date('2026-02-03T09:00:00.000Z').toISOString(),
  endedAt: new Date('2026-02-03T09:42:00.000Z').toISOString(),
  ...over,
});

function props(over: Partial<RecentMeetingRowProps> = {}): RecentMeetingRowProps {
  return {
    meeting: meeting(),
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onRemove: vi.fn(),
    ...over,
  };
}

describe('RecentMeetingRow', () => {
  it('shows the profile chip, the title and how long it ran', () => {
    render(<RecentMeetingRow {...props()} />);

    expect(screen.getByText('Співбесіда')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer — 2 етап')).toBeInTheDocument();
    expect(screen.getByText(/42 хв/)).toBeInTheDocument();
  });

  it('falls back to the profile when a meeting has no title', () => {
    render(
      <RecentMeetingRow
        {...props({ meeting: meeting({ title: null, profile: 'daily' }) })}
      />,
    );

    expect(screen.getAllByText('Дейлі')).toHaveLength(2);
  });

  it('opens the meeting it was clicked on', () => {
    const onOpen = vi.fn();
    render(<RecentMeetingRow {...props({ meeting: meeting({ id: 'm-7' }), onOpen })} />);

    fireEvent.click(screen.getByText('Frontend Developer — 2 етап'));

    expect(onOpen).toHaveBeenCalledWith('m-7');
  });

  it('renames in place and keeps the new title', () => {
    const onRename = vi.fn();
    render(<RecentMeetingRow {...props({ onRename })} />);

    fireEvent.click(screen.getByLabelText('Перейменувати зустріч'));
    fireEvent.change(screen.getByLabelText('Перейменувати зустріч'), {
      target: { value: '  Третій етап  ' },
    });
    fireEvent.keyDown(screen.getByLabelText('Перейменувати зустріч'), { key: 'Enter' });

    expect(onRename).toHaveBeenCalledWith('Третій етап');
  });

  it('leaves the title alone when renaming is cancelled', () => {
    const onRename = vi.fn();
    render(<RecentMeetingRow {...props({ onRename })} />);

    fireEvent.click(screen.getByLabelText('Перейменувати зустріч'));
    fireEvent.change(screen.getByLabelText('Перейменувати зустріч'), {
      target: { value: 'Інша назва' },
    });
    fireEvent.keyDown(screen.getByLabelText('Перейменувати зустріч'), { key: 'Escape' });

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Frontend Developer — 2 етап')).toBeInTheDocument();
  });

  it('carries its id when the row is dragged', () => {
    render(<RecentMeetingRow {...props({ meeting: meeting({ id: 'm-9' }) })} />);

    const setData = vi.fn();
    fireEvent.dragStart(screen.getByText('Frontend Developer — 2 етап').closest('div')!, {
      dataTransfer: { setData, types: [] },
    });

    expect(setData).toHaveBeenCalledWith(MEETING_DRAG_TYPE, 'm-9');
  });

  it('asks to be deleted', () => {
    const onRemove = vi.fn();
    render(<RecentMeetingRow {...props({ onRemove })} />);

    fireEvent.click(screen.getByLabelText('Видалити зустріч'));

    expect(onRemove).toHaveBeenCalled();
  });
});
