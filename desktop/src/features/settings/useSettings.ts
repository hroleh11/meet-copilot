import { useCallback, useEffect, useState } from 'react';
import {
  checkBackend,
  getLocalSettings,
  getUserSettings,
  saveLocalSettings,
  saveUserSettings,
} from '~/shared/ipc/commands';
import type { LocalSettings, UserSettings } from '~/shared/ipc';
import { errorMessage } from '~/shared/lib/command-error';
import { uk } from '~/shared/i18n/uk';

interface UseSettingsResult {
  local: LocalSettings | null;
  user: UserSettings | null;
  status: string | null;
  error: string | null;
  saveLocal: (settings: LocalSettings) => void;
  saveUser: (settings: UserSettings) => void;
  testConnection: () => void;
}

export function useSettings(signedIn: boolean): UseSettingsResult {
  const [local, setLocal] = useState<LocalSettings | null>(null);
  const [user, setUser] = useState<UserSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const report = useCallback((cause: unknown, fallback: string) => {
    setStatus(null);
    setError(errorMessage(cause, fallback));
  }, []);

  useEffect(() => {
    getLocalSettings()
      .then(setLocal)
      .catch((cause: unknown) => {
        report(cause, uk.errors.settings);
      });
  }, [report]);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    getUserSettings()
      .then(setUser)
      .catch((cause: unknown) => {
        report(cause, uk.errors.settings);
      });
  }, [report, signedIn]);

  const saveLocal = useCallback(
    (settings: LocalSettings) => {
      setError(null);

      saveLocalSettings(settings)
        .then((saved) => {
          setLocal(saved);
          setStatus(uk.settings.saved);
        })
        .catch((cause: unknown) => {
          report(cause, uk.errors.settings);
        });
    },
    [report],
  );

  const saveUser = useCallback(
    (settings: UserSettings) => {
      setError(null);

      saveUserSettings(settings)
        .then((saved) => {
          setUser(saved);
          setStatus(uk.settings.saved);
        })
        .catch((cause: unknown) => {
          report(cause, uk.errors.settings);
        });
    },
    [report],
  );

  const testConnection = useCallback(() => {
    setError(null);

    checkBackend()
      .then(() => {
        setStatus(uk.settings.connectionOk);
      })
      .catch((cause: unknown) => {
        report(cause, uk.errors.backend);
      });
  }, [report]);

  return {
    local,
    user: signedIn ? user : null,
    status,
    error,
    saveLocal,
    saveUser,
    testConnection,
  };
}
