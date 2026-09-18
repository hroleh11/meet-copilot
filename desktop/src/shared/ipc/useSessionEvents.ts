import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useSessionStore } from '~/shared/store/sessionStore';
import { APP_EVENT } from './events';
import type {
  SessionStateEvent,
  SourceStatusEvent,
  TranscriptSegmentEvent,
} from './events';

export function useSessionEvents(): void {
  useEffect(() => {
    const session = useSessionStore.getState();

    const subscriptions = [
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
    ];

    return () => {
      void Promise.all(subscriptions).then((unsubscribers) => {
        unsubscribers.forEach((unsubscribe) => {
          unsubscribe();
        });
      });
    };
  }, []);
}
