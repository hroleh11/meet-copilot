import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveTranscript } from '~/features/generation/LiveTranscript';
import type { TranscriptLine } from '~/shared/store/sessionStore';

const line = (over: Partial<TranscriptLine>): TranscriptLine => ({
  id: 'seg-1',
  speaker: 'other',
  text: 'Хто бере задачу з нотифікаціями?',
  isFinal: true,
  ...over,
});

describe('LiveTranscript', () => {
  it('dims the line that is still being recognised', () => {
    render(
      <LiveTranscript
        lines={[
          line({ id: 'a', text: 'Фінальний' }),
          line({ id: 'b', speaker: 'me', text: 'могли б ми…', isFinal: false }),
        ]}
      />,
    );

    expect(screen.getByText('могли б ми…').className).toContain('text-ink-tertiary');
    expect(screen.getByText('Фінальний').className).toContain('text-ink-primary');
  });

  it('holds the newest lines and keeps the older ones a scroll away', () => {
    const lines = Array.from({ length: 60 }, (_, index) =>
      line({ id: String(index), text: `репліка ${index}` }),
    );

    render(<LiveTranscript lines={lines} />);

    expect(screen.getByText('репліка 59')).toBeInTheDocument();
    expect(screen.getByText('репліка 20')).toBeInTheDocument();
    expect(screen.queryByText('репліка 19')).not.toBeInTheDocument();
    expect(
      screen.getByText('Гортайте вгору, щоб побачити попередні репліки.'),
    ).toBeInTheDocument();
  });

  it('labels who said each line', () => {
    render(
      <LiveTranscript
        lines={[line({ id: 'a' }), line({ id: 'b', speaker: 'me', text: 'Я візьму' })]}
      />,
    );

    expect(screen.getByText('Я')).toBeInTheDocument();
    expect(screen.getByText('Інші')).toBeInTheDocument();
  });
});
