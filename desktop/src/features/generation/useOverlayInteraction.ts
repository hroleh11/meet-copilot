import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import type { OverlayInteractionEvent } from '~/shared/ipc';
import { APP_EVENT } from '~/shared/ipc/events';

/// The overlay ignores the mouse until the hotkey hands it back, and the window
/// itself is the only place that knows which of the two states it is in.
export function useOverlayInteraction(): boolean {
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const subscription = listen<OverlayInteractionEvent>(
      APP_EVENT.overlayInteraction,
      (event) => {
        setInteractive(event.payload.interactive);
      },
    );

    return () => {
      void subscription.then((unsubscribe) => {
        unsubscribe();
      });
    };
  }, []);

  return interactive;
}
