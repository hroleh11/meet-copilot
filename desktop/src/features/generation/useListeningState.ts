import { useSessionStore } from '~/shared/store/sessionStore';
import type { ListeningState } from './StatusIndicator';

export function useListeningState(): ListeningState {
  const state = useSessionStore((store) => store.state);
  const lines = useSessionStore((store) => store.lines);

  if (state !== 'listening') {
    return 'idle';
  }

  const speaking = lines.some((line) => !line.isFinal && line.speaker === 'me');

  return speaking ? 'recording' : 'listening';
}
