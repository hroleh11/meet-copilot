import { useEffect, useState } from 'react';
import type { ResourceLimits } from '~/shared/ipc';
import { resourceLimits } from '~/shared/ipc/commands';

const MEGABYTE = 1024 * 1024;

/// The limits are the backend's to decide, so the hint under the buttons asks it
/// rather than repeating numbers that would drift.
export function useResourceLimits(): ResourceLimits | null {
  const [limits, setLimits] = useState<ResourceLimits | null>(null);

  useEffect(() => {
    let wanted = true;

    resourceLimits()
      .then((found) => {
        if (wanted) {
          setLimits(found);
        }
      })
      .catch(() => undefined);

    return () => {
      wanted = false;
    };
  }, []);

  return limits;
}

export function megabytes(bytes: number): string {
  return `${Math.round(bytes / MEGABYTE)} МБ`;
}
