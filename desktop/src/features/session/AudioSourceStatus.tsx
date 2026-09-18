import { uk } from '~/shared/i18n/uk';

export type SourceAvailability = 'connected' | 'missing' | 'unchecked';

export interface AudioSourceStatusProps {
  microphone: SourceAvailability;
  systemAudio: SourceAvailability;
}

const DOT: Record<SourceAvailability, string> = {
  connected: 'bg-success',
  missing: 'bg-danger',
  unchecked: 'bg-ink-tertiary',
};

const LABEL: Record<SourceAvailability, string> = {
  connected: uk.meeting.sourceConnected,
  missing: uk.meeting.sourceMissing,
  unchecked: uk.meeting.sourceUnchecked,
};

function Row({ name, state }: { name: string; state: SourceAvailability }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-sm ${DOT[state]}`} />
      <span className="flex-grow text-body text-ink-primary">{name}</span>
      <span className="text-caption text-ink-secondary">{LABEL[state]}</span>
    </div>
  );
}

export function AudioSourceStatus({ microphone, systemAudio }: AudioSourceStatusProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-separator bg-surface-elevated p-3">
      <Row name={uk.meeting.microphone} state={microphone} />
      <span className="h-px bg-separator" />
      <Row name={uk.meeting.systemAudio} state={systemAudio} />
    </div>
  );
}
