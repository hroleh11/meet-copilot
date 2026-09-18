import { useCallback, useEffect, useState } from 'react';
import { authState, logout, startLogin } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';
import { useAuthStore } from '~/shared/store/authStore';
import { uk } from '~/shared/i18n/uk';

interface UseAuthResult {
  signedIn: boolean;
  ready: boolean;
  profileName: string | null;
  profileEmail: string | null;
  opening: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
}

export function useAuth(): UseAuthResult {
  const { signedIn, profile, ready, setAuth, markReady } = useAuthStore();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authState()
      .then((state) => {
        setAuth(state.signedIn, state.profile);
      })
      .catch(() => {
        markReady();
      });
  }, [markReady, setAuth]);

  const signIn = useCallback(() => {
    setError(null);
    setOpening(true);

    startLogin()
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.login));
      })
      .finally(() => {
        setOpening(false);
      });
  }, []);

  const signOut = useCallback(() => {
    logout()
      .then((state) => {
        setAuth(state.signedIn, state.profile);
      })
      .catch((cause: unknown) => {
        setError(errorMessage(cause, uk.errors.login));
      });
  }, [setAuth]);

  return {
    signedIn,
    ready,
    profileName: profile?.name ?? null,
    profileEmail: profile?.email ?? null,
    opening,
    error,
    signIn,
    signOut,
  };
}
