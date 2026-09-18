import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerView } from '~/features/generation/AnswerView';
import type { AnswerViewProps } from '~/features/generation/AnswerView';

const props = (over: Partial<AnswerViewProps> = {}): AnswerViewProps => ({
  mode: 'reply',
  text: '',
  streaming: false,
  error: null,
  copied: false,
  onCopy: () => undefined,
  onClose: () => undefined,
  ...over,
});

describe('AnswerView', () => {
  it('says it is working before the first words arrive', () => {
    render(<AnswerView {...props({ streaming: true })} />);

    expect(screen.getByText(/Готую відповідь/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Копіювати/ })).toBeDisabled();
  });

  it('marks which of the two answers is on screen', () => {
    render(<AnswerView {...props({ mode: 'alternative', text: 'Інакше кажучи' })} />);

    expect(screen.getByText(/Інший варіант/)).toBeInTheDocument();
  });

  it('copies the answer on request', () => {
    const onCopy = vi.fn();
    render(<AnswerView {...props({ text: 'Так, готовий.', onCopy })} />);

    fireEvent.click(screen.getByRole('button', { name: /Копіювати/ }));

    expect(onCopy).toHaveBeenCalled();
  });

  it('keeps the partial answer visible next to the failure', () => {
    render(<AnswerView {...props({ text: 'половина', error: 'зв’язок обірвався' })} />);

    expect(screen.getByText(/половина/)).toBeInTheDocument();
    expect(screen.getByText('зв’язок обірвався')).toBeInTheDocument();
  });
});
