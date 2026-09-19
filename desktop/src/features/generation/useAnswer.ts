import { useGenerationEvents } from '~/shared/ipc/useGenerationEvents';
import { useGenerationStore } from '~/shared/store/generationStore';

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

  useGenerationEvents();

  return { text, withScreenshot, streaming, error };
}
