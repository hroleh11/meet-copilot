import { useEffect } from 'react';
import { useGenerationEvents } from '~/shared/ipc/useGenerationEvents';
import { useGenerationStore } from '~/shared/store/generationStore';
import { useSessionStore } from '~/shared/store/sessionStore';

interface UseAnswerResult {
  text: string;
  withScreenshot: boolean;
  streaming: boolean;
  error: string | null;
}

export function useAnswer(): UseAnswerResult {
  const text = useGenerationStore((store) => store.text);
  const withScreenshot = useGenerationStore((store) => store.withScreenshot);
  const streaming = useGenerationStore((store) => store.streaming);
  const error = useGenerationStore((store) => store.error);
  const clear = useGenerationStore((store) => store.clear);
  const state = useSessionStore((store) => store.state);

  useGenerationEvents();

  useEffect(() => {
    if (state === 'idle') {
      clear();
    }
  }, [state, clear]);

  return { text, withScreenshot, streaming, error };
}
