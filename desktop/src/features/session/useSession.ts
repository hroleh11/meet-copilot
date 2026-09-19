import { useCallback, useEffect, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Language, MeetingProfile, SessionState } from '~/shared/ipc';
import { sessionState, startSession, stopSession } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';
import { useSessionStore } from '~/shared/store/sessionStore';

interface UseSessionResult {
  state: SessionState;
  notice: string | null;
  error: string | null;
  busy: boolean;
  start: (profile: MeetingProfile, language: Language) => void;
  stop: () => void;
}

export function useSession(): UseSessionResult {
  const state = useSessionStore((store) => store.state);
  const notice = useSessionStore((store) => store.notice);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((profile: MeetingProfile, language: Language) => {
    setError(null);

    startSession(profile, language).catch((cause: unknown) => {
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
