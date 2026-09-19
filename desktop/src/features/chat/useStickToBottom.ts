import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject, UIEvent } from 'react';

const NEAR_EDGE_PX = 48;

interface UseStickToBottomResult {
  viewport: RefObject<HTMLDivElement | null>;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}

/// The newest message is the one being read, so the thread stays at the bottom
/// while the answer streams in. Scrolling up means the user is reading something
/// older, and then the view stops chasing.
export function useStickToBottom(grows: unknown): UseStickToBottomResult {
  const viewport = useRef<HTMLDivElement | null>(null);
  const [following, setFollowing] = useState(true);

  useEffect(() => {
    const element = viewport.current;

    if (!element || !following) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [following, grows]);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    setFollowing(
      element.scrollHeight - element.clientHeight - element.scrollTop <= NEAR_EDGE_PX,
    );
  }, []);

  return { viewport, onScroll };
}
