import { useCallback } from 'react';
import type { UIEvent } from 'react';

const NEAR_END_PX = 120;

/// One page is asked for as the bottom comes into reach, so the list keeps
/// filling itself while the user scrolls.
export function useEndOfList(
  onReachEnd: () => void,
): (event: UIEvent<HTMLElement>) => void {
  return useCallback(
    (event: UIEvent<HTMLElement>) => {
      const element = event.currentTarget;
      const left = element.scrollHeight - element.clientHeight - element.scrollTop;

      if (left <= NEAR_END_PX) {
        onReachEnd();
      }
    },
    [onReachEnd],
  );
}
