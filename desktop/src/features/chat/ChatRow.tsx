import { uk } from '~/shared/i18n/uk';
import type { ChatSession } from '~/shared/ipc';
import { formatDateTime } from '~/shared/lib/format';
import { TrashIcon } from '~/shared/ui';

export interface ChatRowProps {
  chat: ChatSession;
  active: boolean;
  onOpen: (chatId: string) => void;
  onRemove: (chat: ChatSession) => void;
}

export function ChatRow({ chat, active, onOpen, onRemove }: ChatRowProps) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-md border bg-surface-elevated p-3 transition ${
        active ? 'border-accent' : 'border-separator'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          onOpen(chat.id);
        }}
        className="flex min-w-0 flex-grow flex-col gap-px text-left"
      >
        <span className="truncate text-body-emphasized text-ink-primary">
          {chat.title ?? uk.chat.untitled}
        </span>
        <span className="text-caption text-ink-tertiary">
          {formatDateTime(chat.updatedAt)} · {chat.messageCount} {uk.chat.messages}
        </span>
      </button>

      <button
        type="button"
        aria-label={uk.chat.delete}
        onClick={() => {
          onRemove(chat);
        }}
        className="shrink-0 rounded-sm p-1 text-ink-tertiary opacity-0 transition group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
      >
        <TrashIcon />
      </button>
    </div>
  );
}
