import { useGenerationEvents } from '~/shared/ipc/useGenerationEvents';
import { useGenerationStore } from '~/shared/store/generationStore';

interface UseAnswerResult {
  text: string;
  streaming: boolean;
  error: string | null;
}

export function useAnswer(): UseAnswerResult {
  const text = useGenerationStore((store) => store.text);
  const streaming = useGenerationStore((store) => store.streaming);
  const error = useGenerationStore((store) => store.error);

  useGenerationEvents();

  return { text, streaming, error };
}
