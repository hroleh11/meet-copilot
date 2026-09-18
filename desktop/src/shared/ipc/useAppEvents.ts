import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { uk } from '~/shared/i18n/uk';
import { errorMessage } from '~/shared/lib/command-error';
import { useAuthStore } from '~/shared/store/authStore';
import { APP_EVENT } from './events';
import type { AppErrorEvent, AuthStateEvent } from './events';
import { useSessionEvents } from './useSessionEvents';

export function useAppEvents(onError: (message: string) => void): void {
  const setAuth = useAuthStore((store) => store.setAuth);

  useSessionEvents();

  useEffect(() => {
    const subscriptions = [
      listen<AuthStateEvent>(APP_EVENT.authState, (event) => {
        setAuth(event.payload.signedIn, event.payload.profile);
      }),
      listen<AppErrorEvent>(APP_EVENT.appError, (event) => {
        if (event.payload.failure === 'unauthorized') {
          setAuth(false, null);
        }

        onError(errorMessage(event.payload, uk.errors.unexpected));
      }),
    ];

    return () => {
      void Promise.all(subscriptions).then((unsubscribers) => {
        unsubscribers.forEach((unsubscribe) => {
          unsubscribe();
        });
      });
    };
  }, [onError, setAuth]);
}
