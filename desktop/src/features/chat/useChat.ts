import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type {
  ChatDeltaEvent,
  ChatFailedEvent,
  ChatFinishedEvent,
  ChatMessage,
} from '~/shared/ipc';
import { askInChat, chatMessages } from '~/shared/ipc/commands';
import { APP_EVENT } from '~/shared/ipc/events';
import { errorMessage } from '~/shared/lib/command-error';

export interface PendingExchange {
  question: string;
  answer: string;
}

interface UseChatResult {
  messages: ChatMessage[];
  pending: PendingExchange | null;
  error: string | null;
  ask: (question: string) => void;
}

/// The answer streams in as events, so the question sits in `pending` with the
/// text it has so far and only joins the history once the backend has stored it.
/// The exchange being written lives in a ref as well: growing it inside a state
/// updater would make that updater impure, and React runs those twice.
export function useChat(meetingId: string, chatId: string): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingExchange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef<PendingExchange | null>(null);

  useEffect(() => {
    let wanted = true;

    chatMessages(meetingId, chatId)
      .then((history) => {
        if (wanted) {
          setMessages(history);
        }
      })
      .catch((cause: unknown) => {
        if (wanted) {
          setError(errorMessage(cause, uk.errors.chat));
        }
      });

    return () => {
      wanted = false;
    };
  }, [meetingId, chatId]);

  useEffect(() => {
    const subscriptions = [
      listen<ChatDeltaEvent>(APP_EVENT.chatDelta, (event) => {
        if (event.payload.chatId !== chatId || !writing.current) {
          return;
        }

        writing.current = {
          ...writing.current,
          answer: writing.current.answer + event.payload.text,
        };
        setPending(writing.current);
      }),
      listen<ChatFinishedEvent>(APP_EVENT.chatFinished, (event) => {
        if (event.payload.chatId !== chatId) {
          return;
        }

        const written = writing.current;
        writing.current = null;
        setPending(null);

        if (written) {
          setMessages((history) => [
            ...history,
            {
              id: event.payload.messageId,
              ...written,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      }),
      listen<ChatFailedEvent>(APP_EVENT.chatFailed, (event) => {
        if (event.payload.chatId !== chatId) {
          return;
        }

        writing.current = null;
        setPending(null);
        setError(event.payload.message);
      }),
    ];

    return () => {
      for (const subscription of subscriptions) {
        void subscription.then((unsubscribe) => {
          unsubscribe();
        });
      }
    };
  }, [chatId]);

  const ask = useCallback(
    (question: string) => {
      setError(null);
      writing.current = { question, answer: '' };
      setPending(writing.current);

      askInChat(meetingId, chatId, question).catch((cause: unknown) => {
        writing.current = null;
        setPending(null);
        setError(errorMessage(cause, uk.errors.chat));
      });
    },
    [meetingId, chatId],
  );

  return { messages, pending, error, ask };
}
