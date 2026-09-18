import { useCallback, useEffect, useState } from 'react';
import { checkBackend } from '~/shared/ipc/commands';

export type ConnectionState = 'unknown' | 'reachable' | 'unreachable';

interface UseConnectionResult {
  state: ConnectionState;
  check: () => void;
}

export function useConnection(watch?: string): UseConnectionResult {
  const [state, setState] = useState<ConnectionState>('unknown');

  const probe = useCallback(() => {
    checkBackend()
      .then(() => {
        setState('reachable');
      })
      .catch(() => {
        setState('unreachable');
      });
  }, []);

  const check = useCallback(() => {
    setState('unknown');
    probe();
  }, [probe]);

  useEffect(probe, [probe, watch]);

  return { state, check };
}
