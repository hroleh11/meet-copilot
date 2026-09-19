import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useGenerationStore } from '~/shared/store/generationStore';
import { APP_EVENT } from './events';
import type {
  GenerationDeltaEvent,
  GenerationFailedEvent,
  GenerationStartedEvent,
} from './events';

export function useGenerationEvents(): void {
  useEffect(() => {
    const store = useGenerationStore.getState();

    const subscriptions = [
      listen<GenerationStartedEvent>(APP_EVENT.generationStarted, (event) => {
        store.begin(event.payload.mode, event.payload.withScreenshot);
      }),
      listen<GenerationDeltaEvent>(APP_EVENT.generationDelta, (event) => {
        store.append(event.payload.text);
      }),
      listen(APP_EVENT.generationFinished, () => {
        store.finish();
      }),
      listen<GenerationFailedEvent>(APP_EVENT.generationFailed, (event) => {
        store.fail(event.payload.message);
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
