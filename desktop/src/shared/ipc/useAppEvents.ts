import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useAuthStore } from '~/shared/store/authStore';
import { useSessionStore } from '~/shared/store/sessionStore';
import { APP_EVENT } from './events';
import type {
  AppErrorEvent,
  AuthStateEvent,
  SessionStateEvent,
  TranscriptSegmentEvent,
} from './events';

export function useAppEvents(onError: (message: string) => void): void {
  const setAuth = useAuthStore((store) => store.setAuth);

  useEffect(() => {
    const session = useSessionStore.getState();

    const subscriptions = [
      listen<AuthStateEvent>(APP_EVENT.authState, (event) => {
        setAuth(event.payload.signedIn, event.payload.profile);
      }),
      listen<SessionStateEvent>(APP_EVENT.sessionState, (event) => {
        session.setState(
          event.payload.state,
          event.payload.meetingId,
          event.payload.message,
        );
      }),
      listen<TranscriptSegmentEvent>(APP_EVENT.transcriptSegment, (event) => {
        session.addLine(event.payload);
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
