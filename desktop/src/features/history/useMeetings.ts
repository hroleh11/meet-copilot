import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Meeting, MeetingScope } from '~/shared/ipc';
import {
  deleteMeeting,
  listMeetings,
  moveMeeting,
  renameMeeting,
} from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseMeetingsResult {
  meetings: Meeting[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  rename: (id: string, title: string) => void;
  move: (id: string, project: string | null) => void;
  remove: (id: string) => void;
}

const PAGE = 20;

/// The backend answers one page at a time and says nothing about what is left,
/// so a short page is what tells the list it has reached the end. Every change
/// bumps the shared revision instead of patching a row: a meeting that moves
/// leaves one list and joins another, and both counts change with it. Only the
/// newest request is allowed to answer, because a project card clicked while a
/// page is still travelling would otherwise fill the list with the old one.
export function useMeetings(
  scope: MeetingScope,
  revision: number,
  onChanged: () => void,
): UseMeetingsResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const latest = useRef(0);

  const load = useCallback(
    (cursor: string | null) => {
      if (cursor && busy.current) {
        return;
      }

      const ticket = latest.current + 1;
      latest.current = ticket;
      busy.current = true;

      listMeetings(cursor, scope)
        .then((page) => {
          if (ticket !== latest.current) {
            return;
          }

          setMeetings((current) => (cursor ? [...current, ...page] : page));
          setHasMore(page.length === PAGE);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (ticket !== latest.current) {
            return;
          }

          setError(errorMessage(cause, uk.errors.history));
          setHasMore(false);
        })
        .finally(() => {
          if (ticket !== latest.current) {
            return;
          }

          busy.current = false;
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [scope],
  );

  useEffect(() => {
    load(null);
  }, [load, revision]);

  const loadMore = useCallback(() => {
    const last = meetings.at(-1);

    if (!last || !hasMore || busy.current) {
      return;
    }

    setLoadingMore(true);
    load(last.id);
  }, [hasMore, load, meetings]);

  const rename = useCallback(
    (id: string, title: string) => {
      renameMeeting(id, title)
        .then(onChanged)
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.meetingSave));
        });
    },
    [onChanged],
  );

  const move = useCallback(
    (id: string, project: string | null) => {
      moveMeeting(id, project)
        .then(onChanged)
        .catch((cause: unknown) => {
          setError(errorMessage(cause, uk.errors.meetingMove));
        });
    },
    [onChanged],
  );

  const remove = useCallback(
    (id: string) => {
      deleteMeeting(id)
        .then(onChanged)
        .catch((cause: unknown) => {
          setError(
            errorMessage(cause, uk.errors.meetingDelete, {
              conflict: uk.errors.liveMeeting,
            }),
          );
        });
    },
    [onChanged],
  );

  return {
    meetings,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    rename,
    move,
    remove,
  };
}
