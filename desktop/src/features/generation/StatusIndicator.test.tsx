import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusIndicator } from '~/features/generation/StatusIndicator';

describe('StatusIndicator', () => {
  it('says it is listening while the meeting runs', () => {
    render(<StatusIndicator state="listening" />);

    expect(screen.getByText('Слухаю')).toBeInTheDocument();
  });

  it('turns to recording while the microphone carries speech', () => {
    render(<StatusIndicator state="recording" />);

    expect(screen.getByText('Записую')).toBeInTheDocument();
  });

  it('stays quiet when no meeting is running', () => {
    render(<StatusIndicator state="idle" />);

    expect(screen.getByText('Не слухаю')).toBeInTheDocument();
  });
});
