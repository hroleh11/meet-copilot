import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useAuthStore } from '~/shared/store/authStore';
import { APP_EVENT } from './events';
import type { AppErrorEvent, AuthStateEvent } from './events';

export function useAppEvents(onError: (message: string) => void): void {
  const setAuth = useAuthStore((store) => store.setAuth);

  useEffect(() => {
    const subscriptions = [
      listen<AuthStateEvent>(APP_EVENT.authState, (event) => {
        setAuth(event.payload.signedIn, event.payload.profile);
      }),
      listen<AppErrorEvent>(APP_EVENT.appError, (event) => {
        onError(event.payload.message);
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
