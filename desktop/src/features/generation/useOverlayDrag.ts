import { PhysicalPosition, getCurrentWindow } from '@tauri-apps/api/window';
import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const LEFT_BUTTON = 0;

// Tauri's drag region ignores pointers that land on a child element, so the header moves the window itself.
export function useOverlayDrag(): (event: ReactPointerEvent<HTMLElement>) => void {
  return useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== LEFT_BUTTON) {
      return;
    }

    event.preventDefault();

    const overlay = getCurrentWindow();
    const startX = event.screenX;
    const startY = event.screenY;

    void Promise.all([overlay.outerPosition(), overlay.scaleFactor()]).then(
      ([origin, scale]) => {
        const move = (moved: globalThis.PointerEvent): void => {
          void overlay.setPosition(
            new PhysicalPosition(
              origin.x + Math.round((moved.screenX - startX) * scale),
              origin.y + Math.round((moved.screenY - startY) * scale),
            ),
          );
        };

        const stop = (): void => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
      },
    );
  }, []);
}
