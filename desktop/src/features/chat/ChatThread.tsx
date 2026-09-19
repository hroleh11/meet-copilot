import { Fragment } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { ChatMessage } from '~/shared/ipc';
import { formatTime } from '~/shared/lib/format';
import { TypingDots } from '~/shared/ui';
import { ChatBubble } from './ChatBubble';
import type { PendingExchange } from './useChat';
import { useStickToBottom } from './useStickToBottom';

export interface ChatThreadProps {
  messages: ChatMessage[];
  pending: PendingExchange | null;
  error: string | null;
}

export function ChatThread({ messages, pending, error }: ChatThreadProps) {
  const { viewport, onScroll } = useStickToBottom(
    `${messages.length}:${pending?.answer.length ?? 0}:${error ?? ''}`,
  );

  return (
    <div
      ref={viewport}
      onScroll={onScroll}
      className="min-h-0 flex-grow overflow-y-auto p-5"
    >
      <div className="mx-auto flex max-w-[720px] flex-col gap-3">
        {messages.length === 0 && !pending ? (
          <p className="text-body text-ink-tertiary">{uk.chat.empty}</p>
        ) : null}

        {messages.map((message) => (
          <Fragment key={message.id}>
            <ChatBubble side="me" time={formatTime(message.createdAt)}>
              {message.question}
            </ChatBubble>
            <ChatBubble side="assistant" time={formatTime(message.createdAt)}>
              {message.answer}
            </ChatBubble>
          </Fragment>
        ))}

        {pending ? (
          <Fragment>
            <ChatBubble side="me" time={null}>
              {pending.question}
            </ChatBubble>
            <ChatBubble side="assistant" time={null}>
              {pending.answer || <TypingDots label={uk.chat.thinking} />}
            </ChatBubble>
          </Fragment>
        ) : null}

        {error ? <p className="text-body text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
