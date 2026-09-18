import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AudioSourceStatus } from '~/features/session/AudioSourceStatus';

describe('AudioSourceStatus', () => {
  it('shows both sources as connected', () => {
    render(<AudioSourceStatus microphone="connected" systemAudio="connected" />);

    expect(screen.getAllByText('Підключено')).toHaveLength(2);
  });

  it('separates a working microphone from meeting audio nobody granted', () => {
    render(<AudioSourceStatus microphone="connected" systemAudio="missing" />);

    expect(screen.getByText('Підключено')).toBeInTheDocument();
    expect(screen.getByText('Немає доступу')).toBeInTheDocument();
  });

  it('admits when a source was never checked', () => {
    render(<AudioSourceStatus microphone="unchecked" systemAudio="unchecked" />);

    expect(screen.getAllByText('Не перевірено')).toHaveLength(2);
  });
});
