import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useChat } from '~/features/chat/useChat';
import { APP_EVENT } from '~/shared/ipc/events';

const { invoke, listeners } = vi.hoisted(() => ({
  invoke: vi.fn(),
  listeners: new Map<string, Set<(event: { payload: unknown }) => void>>(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (name: string, handler: (event: { payload: unknown }) => void) => {
    const forName = listeners.get(name) ?? new Set();
    forName.add(handler);
    listeners.set(name, forName);

    return Promise.resolve(() => forName.delete(handler));
  },
}));

function emit(name: string, payload: unknown): void {
  act(() => {
    for (const handler of listeners.get(name) ?? []) {
      handler({ payload });
    }
  });
}

function Chat() {
  const chat = useChat('m-1', 'chat-1');

  return (
    <div>
      <button type="button" onClick={() => chat.ask('Скільки тривала зустріч?')}>
        ask
      </button>
      {chat.messages.map((message) => (
        <p key={message.id}>{message.answer}</p>
      ))}
      {chat.pending ? <em>{chat.pending.answer}</em> : null}
    </div>
  );
}

describe('useChat', () => {
  it('keeps one answer when the stream finishes, not one per render pass', async () => {
    invoke.mockResolvedValue([]);

    render(
      <StrictMode>
        <Chat />
      </StrictMode>,
    );

    await act(() => {
      screen.getByText('ask').click();

      return Promise.resolve();
    });

    emit(APP_EVENT.chatDelta, { chatId: 'chat-1', text: 'Розмова тривала ' });
    emit(APP_EVENT.chatDelta, { chatId: 'chat-1', text: '17 хвилин.' });

    expect(screen.getByText('Розмова тривала 17 хвилин.')).toBeInTheDocument();

    emit(APP_EVENT.chatFinished, { chatId: 'chat-1', messageId: 'message-1' });

    expect(screen.getAllByText('Розмова тривала 17 хвилин.')).toHaveLength(1);
  });

  it('ignores what belongs to another chat', async () => {
    invoke.mockResolvedValue([]);

    render(
      <StrictMode>
        <Chat />
      </StrictMode>,
    );

    await act(() => {
      screen.getByText('ask').click();

      return Promise.resolve();
    });

    emit(APP_EVENT.chatDelta, { chatId: 'chat-2', text: 'не сюди' });

    expect(screen.queryByText('не сюди')).not.toBeInTheDocument();
  });
});
