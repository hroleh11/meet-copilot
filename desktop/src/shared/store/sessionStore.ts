import { create } from 'zustand';
import type { SessionState, Speaker } from '~/shared/ipc';

export interface TranscriptLine {
  id: string;
  speaker: Speaker;
  text: string;
  isFinal: boolean;
}

interface SessionStore {
  state: SessionState;
  meetingId: string | null;
  notice: string | null;
  lines: TranscriptLine[];
  setState: (
    state: SessionState,
    meetingId: string | null,
    notice: string | null,
  ) => void;
  addLine: (line: TranscriptLine) => void;
  clearTranscript: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  state: 'idle',
  meetingId: null,
  notice: null,
  lines: [],
  setState: (state, meetingId, notice) => set({ state, meetingId, notice }),
  addLine: (line) => set((store) => ({ lines: merge(store.lines, line) })),
  clearTranscript: () => set({ lines: [] }),
}));

export function merge(lines: TranscriptLine[], line: TranscriptLine): TranscriptLine[] {
  const kept = line.isFinal
    ? lines.filter((candidate) => candidate.isFinal || candidate.speaker !== line.speaker)
    : lines;

  const existing = kept.findIndex((candidate) => candidate.id === line.id);

  if (existing === -1) {
    return [...kept, line];
  }

  const next = [...kept];
  next[existing] = line;

  return next;
}
