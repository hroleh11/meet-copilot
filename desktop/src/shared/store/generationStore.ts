import { create } from 'zustand';
import type { GenerationMode } from '~/shared/ipc';

interface GenerationStore {
  mode: GenerationMode | null;
  withScreenshot: boolean;
  text: string;
  streaming: boolean;
  error: string | null;
  begin: (mode: GenerationMode, withScreenshot: boolean) => void;
  append: (text: string) => void;
  finish: () => void;
  fail: (message: string) => void;
}

export const useGenerationStore = create<GenerationStore>((set) => ({
  mode: null,
  withScreenshot: false,
  text: '',
  streaming: false,
  error: null,
  begin: (mode, withScreenshot) =>
    set({ mode, withScreenshot, text: '', streaming: true, error: null }),
  append: (text) => set((store) => ({ text: store.text + text })),
  finish: () => set({ streaming: false }),
  fail: (message) => set({ streaming: false, error: message }),
}));
