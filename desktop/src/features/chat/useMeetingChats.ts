import { useCallback, useEffect, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { ChatSession } from '~/shared/ipc';
import { deleteMeetingChat, meetingChats, startMeetingChat } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseMeetingChatsResult {
  chats: ChatSession[];
  loading: boolean;
  error: string | null;
  start: () => void;
  remove: (chatId: string) => void;
}

/// The list is asked for again whenever the search changes, because a chat also
/// matches on what was asked inside it, which only the backend can see. It is
/// asked for again on `refreshOn` too: an answer stored in the open chat gives
/// that chat its name and a higher count, and the row beside it must say so.
export function useMeetingChats(
  meetingId: string,
  query: string,
  refreshOn: number,
  onOpen: (chatId: string) => void,
  onRemoved: (chatId: string) => void,
): UseMeetingChatsResult {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let wanted = true;

    meetingChats(meetingId, query.trim() || null)
      .then((found) => {
        if (wanted) {
          setChats(found);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (wanted) {
          setError(errorMessage(cause, uk.errors.chats));
        }
      })
      .finally(() => {
        if (wanted) {
          setLoading(false);
        }
      });

    return () => {
      wanted = false;
    };
  }, [meetingId, query, refreshOn, reloads]);

  const start = useCallback(() => {
    startMeetingChat(meetingId)
      .then((chat) => {
        setReloads((count) => count + 1);
        onOpen(chat.id);
      })
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.chats));
      });
  }, [meetingId, onOpen]);

  const remove = useCallback(
    (chatId: string) => {
      deleteMeetingChat(meetingId, chatId)
        .then(() => {
          setChats((current) => current.filter((chat) => chat.id !== chatId));
          onRemoved(chatId);
        })
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.chatDelete));
        });
    },
    [meetingId, onRemoved],
  );

  return { chats, loading, error, start, remove };
}
