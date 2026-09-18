import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback, useEffect, useState } from 'react';
import { generate } from '~/shared/ipc/commands';
import { useGenerationEvents } from '~/shared/ipc/useGenerationEvents';
import { useGenerationStore } from '~/shared/store/generationStore';

const COPIED_FOR_MS = 1500;

interface UseAnswerResult {
  text: string;
  streaming: boolean;
  error: string | null;
  copied: boolean;
  copy: () => void;
  regenerate: () => void;
}

export function useAnswer(): UseAnswerResult {
  const text = useGenerationStore((store) => store.text);
  const streaming = useGenerationStore((store) => store.streaming);
  const error = useGenerationStore((store) => store.error);
  const [copied, setCopied] = useState(false);

  useGenerationEvents();

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => {
      setCopied(false);
    }, COPIED_FOR_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  const copy = useCallback(() => {
    void writeText(useGenerationStore.getState().text).then(() => {
      setCopied(true);
    });
  }, []);

  const regenerate = useCallback(() => {
    void generate('alternative');
  }, []);

  return { text, streaming, error, copied, copy, regenerate };
}
