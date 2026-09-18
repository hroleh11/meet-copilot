import { uk } from '~/shared/i18n/uk';
import type { SessionState, Speaker } from '~/shared/ipc';
import type { SourceStatus } from '~/shared/store/sessionStore';
import type { ConnectionState } from './useConnection';

export interface StatusListProps {
  state: SessionState;
  sources: SourceStatus[];
  connection: ConnectionState;
  onRetryConnection: () => void;
}

type Tone = 'good' | 'idle' | 'bad';

interface Row {
  label: string;
  value: string;
  tone: Tone;
  retry?: boolean;
}

const SESSION_STATUS: Record<SessionState, string> = {
  idle: uk.meeting.idle,
  starting: uk.meeting.starting,
  listening: uk.meeting.listening,
  stopping: uk.meeting.stopping,
};

const SPEAKERS: Speaker[] = ['me', 'other'];

const SOURCE_LABEL: Record<Speaker, string> = {
  me: uk.settings.microphone,
  other: uk.settings.systemAudio,
};

const CONNECTION: Record<ConnectionState, Omit<Row, 'label'>> = {
  unknown: { value: uk.meeting.connectionUnknown, tone: 'idle' },
  reachable: { value: uk.meeting.connectionOk, tone: 'good' },
  unreachable: { value: uk.meeting.connectionDown, tone: 'bad', retry: true },
};

const DOT: Record<Tone, string> = {
  good: 'bg-emerald-500',
  idle: 'bg-neutral-600',
  bad: 'bg-red-500',
};

function sourceRow(speaker: Speaker, sources: SourceStatus[]): Row {
  const status = sources.find((source) => source.speaker === speaker);

  if (!status) {
    return { label: SOURCE_LABEL[speaker], value: uk.meeting.sourceOff, tone: 'idle' };
  }

  return {
    label: SOURCE_LABEL[speaker],
    value: status.active ? uk.meeting.sourceActive : uk.meeting.sourceBroken,
    tone: status.active ? 'good' : 'bad',
  };
}

function rowsFor(
  state: SessionState,
  sources: SourceStatus[],
  connection: ConnectionState,
) {
  return [
    {
      label: uk.meeting.title,
      value: SESSION_STATUS[state],
      tone: state === 'listening' ? 'good' : 'idle',
    } satisfies Row,
    ...SPEAKERS.map((speaker) => sourceRow(speaker, sources)),
    { label: uk.meeting.connection, ...CONNECTION[connection] } satisfies Row,
  ];
}

export function StatusList({
  state,
  sources,
  connection,
  onRetryConnection,
}: StatusListProps) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {rowsFor(state, sources, connection).map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[row.tone]}`} />
          <dt className="text-neutral-500">{row.label}</dt>
          <dd className="text-neutral-200">{row.value}</dd>
          {row.retry ? (
            <button
              type="button"
              onClick={onRetryConnection}
              className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-200"
            >
              {uk.meeting.retry}
            </button>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
