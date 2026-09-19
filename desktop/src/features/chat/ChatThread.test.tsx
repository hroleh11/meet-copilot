import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatThread } from '~/features/chat/ChatThread';
import type { ChatMessage } from '~/shared/ipc';

const message: ChatMessage = {
  id: 'message-1',
  question: 'Скільки тривала зустріч?',
  answer: 'Розмова тривала 17 хвилин.',
  createdAt: '2026-09-19T13:27:00.000Z',
};

describe('ChatThread', () => {
  it('puts the question and the answer in bubbles of their own', () => {
    render(<ChatThread messages={[message]} pending={null} error={null} />);

    const bubbles = screen.getAllByText(/зустріч|тривала/);

    expect(bubbles.map((bubble) => bubble.textContent)).toEqual([
      'Скільки тривала зустріч?',
      'Розмова тривала 17 хвилин.',
    ]);
  });

  it('shows the dots while the answer has not started', () => {
    render(
      <ChatThread
        messages={[]}
        pending={{ question: 'А хто говорив більше?', answer: '' }}
        error={null}
      />,
    );

    expect(screen.getByRole('status', { name: 'Думаю…' })).toBeInTheDocument();
  });

  it('shows the part of the answer that has arrived', () => {
    render(
      <ChatThread
        messages={[]}
        pending={{ question: 'А хто говорив більше?', answer: 'Більше говорив' }}
        error={null}
      />,
    );

    expect(screen.getByText('Більше говорив')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
