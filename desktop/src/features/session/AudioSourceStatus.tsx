import { uk } from '~/shared/i18n/uk';
import type { AudioPermission } from '~/shared/ipc';
import { ChevronRightIcon } from '~/shared/ui';

export type SourceAvailability = 'connected' | 'missing' | 'unchecked';

export interface AudioSourceStatusProps {
  microphone: SourceAvailability;
  systemAudio: SourceAvailability;
  onOpenPermission: (permission: AudioPermission) => void;
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

interface RowProps {
  name: string;
  state: SourceAvailability;
  onOpen: () => void;
}

function Row({ name, state, onOpen }: RowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={uk.meeting.openPermission}
      className="flex items-center gap-2 rounded-sm px-1 py-1 text-left transition hover:bg-surface-primary"
    >
      <span className={`h-2 w-2 shrink-0 rounded-sm ${DOT[state]}`} />
      <span className="flex-grow text-body text-ink-primary">{name}</span>
      <span className="text-caption text-ink-secondary">{LABEL[state]}</span>
      <ChevronRightIcon size={12} className="shrink-0 text-ink-tertiary" />
    </button>
  );
}

export function AudioSourceStatus({
  microphone,
  systemAudio,
  onOpenPermission,
}: AudioSourceStatusProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-separator bg-surface-elevated p-2">
      <Row
        name={uk.meeting.microphone}
        state={microphone}
        onOpen={() => {
          onOpenPermission('microphone');
        }}
      />
      <span className="mx-1 h-px bg-separator" />
      <Row
        name={uk.meeting.systemAudio}
        state={systemAudio}
        onOpen={() => {
          onOpenPermission('systemAudio');
        }}
      />
    </div>
  );
}
