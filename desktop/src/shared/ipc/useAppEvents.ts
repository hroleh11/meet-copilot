import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { uk } from '~/shared/i18n/uk';
import { errorMessage } from '~/shared/lib/command-error';
import { useAuthStore } from '~/shared/store/authStore';
import { useSessionStore } from '~/shared/store/sessionStore';
import { APP_EVENT } from './events';
import type {
  AppErrorEvent,
  AuthStateEvent,
  SessionStateEvent,
  SourceStatusEvent,
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
      listen<SourceStatusEvent>(APP_EVENT.sourceStatus, (event) => {
        session.setSource(event.payload);
      }),
      listen<TranscriptSegmentEvent>(APP_EVENT.transcriptSegment, (event) => {
        session.addLine(event.payload);
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
