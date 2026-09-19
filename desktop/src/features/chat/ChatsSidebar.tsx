import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { ChatSession } from '~/shared/ipc';
import { Button, ConfirmDialog, PlusIcon, TextInput } from '~/shared/ui';
import { ChatRow } from './ChatRow';
import { useMeetingChats } from './useMeetingChats';

export interface ChatsSidebarProps {
  meetingId: string;
  activeChatId: string | null;
  answered: number;
  onOpenChat: (chatId: string) => void;
  onChatRemoved: (chatId: string) => void;
}

export function ChatsSidebar({
  meetingId,
  activeChatId,
  answered,
  onOpenChat,
  onChatRemoved,
}: ChatsSidebarProps) {
  const [query, setQuery] = useState('');
  const [leaving, setLeaving] = useState<ChatSession | null>(null);
  const chats = useMeetingChats(meetingId, query, answered, onOpenChat, onChatRemoved);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-separator bg-surface-secondary">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-separator px-5">
        <h2 className="text-headline text-ink-primary">{uk.chat.title}</h2>
        <Button type="button" className="h-8" onClick={chats.start}>
          <PlusIcon size={12} />
          {uk.chat.newChat}
        </Button>
      </header>

      <div className="shrink-0 p-3">
        <TextInput
          value={query}
          aria-label={uk.chat.search}
          placeholder={uk.chat.search}
          tone="recessed"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          className="w-full"
        />
      </div>

      <div className="flex min-h-0 flex-grow flex-col gap-2 overflow-y-auto px-3 pb-3">
        {chats.chats.map((chat) => (
          <ChatRow
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            onOpen={onOpenChat}
            onRemove={setLeaving}
          />
        ))}

        {!chats.loading && chats.chats.length === 0 ? (
          <p className="text-body text-ink-tertiary">
            {query.trim() ? uk.chat.nothingFound : uk.chat.noChats}
          </p>
        ) : null}

        {chats.error ? <p className="text-body text-danger">{chats.error}</p> : null}
      </div>

      {leaving ? (
        <ConfirmDialog
          title={uk.chat.deleteTitle}
          description={uk.chat.deleteHint.replace(
            '{title}',
            leaving.title ?? uk.chat.untitled,
          )}
          confirmLabel={uk.chat.deleteConfirm}
          cancelLabel={uk.chat.cancel}
          onConfirm={() => {
            chats.remove(leaving.id);
            setLeaving(null);
          }}
          onCancel={() => {
            setLeaving(null);
          }}
        />
      ) : null}
    </aside>
  );
}
