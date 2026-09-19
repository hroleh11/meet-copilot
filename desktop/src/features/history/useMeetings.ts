import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { listMeetings } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseMeetingsResult {
  meetings: Meeting[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
}

const PAGE = 20;

/// The backend answers one page at a time and says nothing about what is left,
/// so a short page is what tells the list it has reached the end.
export function useMeetings(): UseMeetingsResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const load = useCallback((cursor: string | null) => {
    if (busy.current) {
      return;
    }

    busy.current = true;

    listMeetings(cursor)
      .then((page) => {
        setMeetings((current) => (cursor ? [...current, ...page] : page));
        setHasMore(page.length === PAGE);
      })
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.history));
        setHasMore(false);
      })
      .finally(() => {
        busy.current = false;
        setLoading(false);
        setLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    load(null);
  }, [load]);

  const loadMore = useCallback(() => {
    const last = meetings.at(-1);

    if (!last || !hasMore || busy.current) {
      return;
    }

    setLoadingMore(true);
    load(last.id);
  }, [hasMore, load, meetings]);

  return { meetings, loading, loadingMore, hasMore, error, loadMore };
}
