import { uk } from '~/shared/i18n/uk';

export type ListeningState = 'idle' | 'listening' | 'recording';

export interface StatusIndicatorProps {
  state: ListeningState;
}

const DOT: Record<ListeningState, string> = {
  idle: 'bg-ink-tertiary',
  listening: 'bg-success',
  recording: 'bg-danger',
};

const LABEL: Record<ListeningState, string> = {
  idle: uk.answer.idle,
  listening: uk.answer.listening,
  recording: uk.answer.recording,
};

export function StatusIndicator({ state }: StatusIndicatorProps) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-sm ${DOT[state]}`} />
      <span className="text-body-emphasized text-ink-primary">{LABEL[state]}</span>
    </span>
  );
}
