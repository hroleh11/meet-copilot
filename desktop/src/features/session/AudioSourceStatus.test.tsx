import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AudioSourceStatus } from '~/features/session/AudioSourceStatus';

describe('AudioSourceStatus', () => {
  it('shows both sources as connected', () => {
    render(
      <AudioSourceStatus
        microphone="connected"
        systemAudio="connected"
        onOpenPermission={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Підключено')).toHaveLength(2);
  });

  it('separates a working microphone from meeting audio nobody granted', () => {
    render(
      <AudioSourceStatus
        microphone="connected"
        systemAudio="missing"
        onOpenPermission={vi.fn()}
      />,
    );

    expect(screen.getByText('Підключено')).toBeInTheDocument();
    expect(screen.getByText('Немає доступу')).toBeInTheDocument();
  });

  it('admits when a source was never checked', () => {
    render(
      <AudioSourceStatus
        microphone="unchecked"
        systemAudio="unchecked"
        onOpenPermission={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Не перевірено')).toHaveLength(2);
  });

  it('opens the permission of the source that was clicked', () => {
    const onOpenPermission = vi.fn();
    render(
      <AudioSourceStatus
        microphone="missing"
        systemAudio="missing"
        onOpenPermission={onOpenPermission}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Мікрофон/ }));
    fireEvent.click(screen.getByRole('button', { name: /Системний звук/ }));

    expect(onOpenPermission).toHaveBeenNthCalledWith(1, 'microphone');
    expect(onOpenPermission).toHaveBeenNthCalledWith(2, 'systemAudio');
  });
});
