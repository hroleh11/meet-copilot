import { useCallback, useEffect, useState } from 'react';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseRegionDragResult {
  rect: Rect | null;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
}

const MIN_EDGE = 8;

export function useRegionDrag(
  onPick: (rect: Rect) => void,
  onCancel: () => void,
): UseRegionDragResult {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel]);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    setStart({ x: event.clientX, y: event.clientY });
    setRect({ x: event.clientX, y: event.clientY, width: 0, height: 0 });
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!start) {
        return;
      }

      setRect(between(start, { x: event.clientX, y: event.clientY }));
    },
    [start],
  );

  const onPointerUp = useCallback(() => {
    setStart(null);

    if (rect && rect.width >= MIN_EDGE && rect.height >= MIN_EDGE) {
      onPick(rect);

      return;
    }

    onCancel();
  }, [onCancel, onPick, rect]);

  return { rect, onPointerDown, onPointerMove, onPointerUp };
}

function between(from: { x: number; y: number }, to: { x: number; y: number }): Rect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}
