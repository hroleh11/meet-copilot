import { useCallback, useEffect, useRef, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Meeting, MeetingDetails } from '~/shared/ipc';
import { getMeeting, listMeetings } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';

interface UseHistoryResult {
  meetings: Meeting[];
  selectedId: string | null;
  details: MeetingDetails | null;
  loading: boolean;
  error: string | null;
  select: (id: string) => void;
  reload: () => void;
}

export function useHistory(initialId: string | null = null): UseHistoryResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [details, setDetails] = useState<MeetingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wanted = useRef<string | null>(initialId);

  const load = useCallback(() => {
    listMeetings()
      .then(setMeetings)
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.history));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    load();
  }, [load]);

  useEffect(load, [load]);

  const loadDetails = useCallback((id: string) => {
    getMeeting(id)
      .then((loaded) => {
        if (wanted.current === id) {
          setDetails(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (wanted.current === id) {
          setError(errorMessage(cause, uk.errors.history));
        }
      });
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadDetails(selectedId);
    }
  }, [loadDetails, selectedId]);

  const select = useCallback((id: string) => {
    wanted.current = id;
    setSelectedId(id);
    setDetails(null);
    setError(null);
  }, []);

  return { meetings, selectedId, details, loading, error, select, reload };
}
