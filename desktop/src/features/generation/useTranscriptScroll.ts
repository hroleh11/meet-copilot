import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject, UIEvent } from 'react';

const PAGE = 40;
const NEAR_EDGE_PX = 24;

interface UseTranscriptScrollResult {
  viewport: RefObject<HTMLDivElement | null>;
  visible: number;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}

/// The transcript grows from the bottom, so the newest line is what the user
/// wants to see and older ones are loaded a page at a time while scrolling up.
/// Scrolling up also means the user is reading, and the view stops chasing the
/// bottom until they come back to it.
export function useTranscriptScroll(total: number): UseTranscriptScrollResult {
  const viewport = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [following, setFollowing] = useState(true);

  useEffect(() => {
    const element = viewport.current;

    if (!element || !following) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [following, total, visible]);

  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const bottom = element.scrollHeight - element.clientHeight - element.scrollTop;

      setFollowing(bottom <= NEAR_EDGE_PX);

      if (element.scrollTop <= NEAR_EDGE_PX) {
        setVisible((shown) => (shown < total ? shown + PAGE : shown));
      }
    },
    [total],
  );

  return { viewport, visible, onScroll };
}
