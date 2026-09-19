import { useCallback, useEffect, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { MeetingStart, SessionState } from '~/shared/ipc';
import { sessionState, startSession, stopSession } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';
import { useSessionStore } from '~/shared/store/sessionStore';

interface UseSessionResult {
  state: SessionState;
  notice: string | null;
  error: string | null;
  busy: boolean;
  start: (meeting: MeetingStart, onStarted: () => void) => void;
  stop: () => void;
}

export function useSession(): UseSessionResult {
  const state = useSessionStore((store) => store.state);
  const notice = useSessionStore((store) => store.notice);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((meeting: MeetingStart, onStarted: () => void) => {
    setError(null);

    startSession(meeting)
      .then(onStarted)
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.session));
      });
  }, []);

  const stop = useCallback(() => {
    setError(null);

    stopSession().catch((cause: unknown) => {
      setError(errorMessage(cause, uk.errors.session));
    });
  }, []);

  useEffect(() => {
    sessionState()
      .then((current) => {
        const store = useSessionStore.getState();

        if (store.state !== current) {
          store.setState(current, store.meetingId, store.notice);
        }
      })
      .catch(() => undefined);
  }, []);

  return {
    state,
    notice,
    error,
    busy: state === 'starting' || state === 'stopping',
    start,
    stop,
  };
}
