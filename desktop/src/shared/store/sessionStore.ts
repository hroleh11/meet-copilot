import { create } from 'zustand';
import type { SessionState, Speaker } from '~/shared/ipc';

export interface SourceStatus {
  speaker: Speaker;
  active: boolean;
}

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
  sources: SourceStatus[];
  lines: TranscriptLine[];
  setState: (
    state: SessionState,
    meetingId: string | null,
    notice: string | null,
  ) => void;
  setSource: (status: SourceStatus) => void;
  addLine: (line: TranscriptLine) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  state: 'idle',
  meetingId: null,
  notice: null,
  sources: [],
  lines: [],
  setState: (state, meetingId, notice) =>
    set((store) => ({
      state,
      meetingId,
      notice,
      sources: state === 'listening' ? store.sources : [],
      lines: running(state) ? store.lines : [],
    })),
  setSource: (status) =>
    set((store) => ({ sources: replaceSource(store.sources, status) })),
  addLine: (line) => set((store) => ({ lines: merge(store.lines, line) })),
}));

function running(state: SessionState): boolean {
  return state === 'listening' || state === 'stopping';
}

function replaceSource(sources: SourceStatus[], status: SourceStatus): SourceStatus[] {
  const kept = sources.filter((source) => source.speaker !== status.speaker);

  return [...kept, status];
}

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
