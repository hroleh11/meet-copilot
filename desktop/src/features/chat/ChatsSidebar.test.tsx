import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatsSidebar } from '~/features/chat/ChatsSidebar';
import type { ChatsSidebarProps } from '~/features/chat/ChatsSidebar';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const chat = {
  id: 'chat-1',
  title: 'Скільки тривала зустріч?',
  messageCount: 2,
  updatedAt: '2026-09-19T13:27:00.000Z',
};

function answer(command: string, args: Record<string, unknown>): unknown {
  if (command === 'meeting_chats') {
    return args['query'] === 'реліз' ? [] : [chat];
  }

  if (command === 'start_meeting_chat') {
    return { id: 'chat-2', title: null, messageCount: 0, updatedAt: '' };
  }

  return undefined;
}

function props(over: Partial<ChatsSidebarProps>): ChatsSidebarProps {
  return {
    meetingId: 'm-1',
    activeChatId: null,
    answered: 0,
    onOpenChat: vi.fn(),
    onChatRemoved: vi.fn(),
    ...over,
  };
}

describe('ChatsSidebar', () => {
  it('lists the chats of this meeting and opens the one that was clicked', async () => {
    invoke.mockImplementation((command: string, args: Record<string, unknown>) =>
      Promise.resolve(answer(command, args)),
    );

    const onOpenChat = vi.fn();

    render(<ChatsSidebar {...props({ onOpenChat })} />);

    fireEvent.click(await screen.findByText('Скільки тривала зустріч?'));

    expect(onOpenChat).toHaveBeenCalledWith('chat-1');
  });

  it('asks the backend again with what was typed into the search', async () => {
    invoke.mockImplementation((command: string, args: Record<string, unknown>) =>
      Promise.resolve(answer(command, args)),
    );

    render(<ChatsSidebar {...props({})} />);

    fireEvent.change(await screen.findByLabelText('Пошук по чатах'), {
      target: { value: 'реліз' },
    });

    expect(await screen.findByText('Нічого не знайшли.')).toBeInTheDocument();
  });

  it('deletes a chat only after the row has asked', async () => {
    invoke.mockImplementation((command: string, args: Record<string, unknown>) =>
      Promise.resolve(answer(command, args)),
    );

    const onChatRemoved = vi.fn();

    render(<ChatsSidebar {...props({ onChatRemoved })} />);

    fireEvent.click(await screen.findByLabelText('Видалити чат'));

    expect(invoke).not.toHaveBeenCalledWith('delete_meeting_chat', expect.anything());
    expect(screen.getByRole('alertdialog', { name: 'Видалити чат?' })).toHaveTextContent(
      '«Скільки тривала зустріч?» зникне',
    );

    fireEvent.click(screen.getByText('Видалити'));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_meeting_chat', {
        id: 'm-1',
        chat: 'chat-1',
      });
    });

    expect(onChatRemoved).toHaveBeenCalledWith('chat-1');
    expect(screen.queryByText('Скільки тривала зустріч?')).not.toBeInTheDocument();
  });

  it('keeps the chat when the dialog is dismissed', async () => {
    invoke.mockImplementation((command: string, args: Record<string, unknown>) =>
      Promise.resolve(answer(command, args)),
    );

    render(<ChatsSidebar {...props({})} />);

    fireEvent.click(await screen.findByLabelText('Видалити чат'));
    fireEvent.click(screen.getByText('Скасувати'));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith('delete_meeting_chat', expect.anything());
    expect(screen.getByText('Скільки тривала зустріч?')).toBeInTheDocument();
  });

  it('closes the dialog on Escape without deleting', async () => {
    invoke.mockImplementation((command: string, args: Record<string, unknown>) =>
      Promise.resolve(answer(command, args)),
    );

    render(<ChatsSidebar {...props({})} />);

    fireEvent.click(await screen.findByLabelText('Видалити чат'));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith('delete_meeting_chat', expect.anything());
  });

  it('starts a new chat and opens the one it created', async () => {
    invoke.mockImplementation((command: string, args: Record<string, unknown>) =>
      Promise.resolve(answer(command, args)),
    );

    const onOpenChat = vi.fn();

    render(<ChatsSidebar {...props({ onOpenChat })} />);

    fireEvent.click(screen.getByText('Новий чат'));

    await waitFor(() => {
      expect(onOpenChat).toHaveBeenCalledWith('chat-2');
    });
  });
});
