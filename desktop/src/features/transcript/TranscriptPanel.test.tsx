import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TranscriptPanel } from '~/features/transcript/TranscriptPanel';
import type { TranscriptLine } from '~/shared/store/sessionStore';

const line = (over: Partial<TranscriptLine>): TranscriptLine => ({
  id: 'seg-1',
  speaker: 'me',
  text: 'Привіт',
  isFinal: true,
  ...over,
});

describe('TranscriptPanel', () => {
  it('explains that nothing has been said yet', () => {
    render(<TranscriptPanel lines={[]} />);

    expect(screen.getByText(/Транскрипт з’явиться/)).toBeInTheDocument();
  });

  it('labels who said each line', () => {
    render(
      <TranscriptPanel
        lines={[
          line({ id: 'a', speaker: 'me', text: 'Я готовий' }),
          line({ id: 'b', speaker: 'other', text: 'Розкажіть про досвід' }),
        ]}
      />,
    );

    expect(screen.getByText('Я')).toBeInTheDocument();
    expect(screen.getByText('Співрозмовник')).toBeInTheDocument();
  });

  it('dims a line that is still being recognised', () => {
    render(
      <TranscriptPanel
        lines={[
          line({ id: 'a', text: 'Фінальний' }),
          line({ id: 'b', text: 'Проміжний', isFinal: false }),
        ]}
      />,
    );

    const interim = screen.getByText(/Проміжний/);
    const final = screen.getByText(/Фінальний/);

    expect(interim.className).toContain('text-neutral-500');
    expect(final.className).toContain('text-neutral-200');
  });
});
