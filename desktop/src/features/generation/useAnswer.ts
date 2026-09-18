import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback, useEffect, useState } from 'react';
import { cancelGeneration } from '~/shared/ipc/commands';
import { useGenerationEvents } from '~/shared/ipc/useGenerationEvents';
import { useGenerationStore } from '~/shared/store/generationStore';

const COPIED_FOR_MS = 1500;

interface UseAnswerResult {
  mode: ReturnType<typeof useGenerationStore.getState>['mode'];
  text: string;
  streaming: boolean;
  error: string | null;
  copied: boolean;
  copy: () => void;
  close: () => void;
}

export function useAnswer(): UseAnswerResult {
  const mode = useGenerationStore((store) => store.mode);
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

  const close = useCallback(() => {
    void cancelGeneration();
  }, []);

  return { mode, text, streaming, error, copied, copy, close };
}
