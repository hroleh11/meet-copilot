import { uk } from '~/shared/i18n/uk';
import type { SessionState } from '~/shared/ipc';
import { Button, PlayIcon } from '~/shared/ui';

export interface StartMeetingButtonProps {
  state: SessionState;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
}

const LABEL: Record<SessionState, string> = {
  idle: uk.meeting.start,
  starting: uk.meeting.starting,
  listening: uk.meeting.stop,
  stopping: uk.meeting.stopping,
};

export function StartMeetingButton({
  state,
  busy,
  onStart,
  onStop,
}: StartMeetingButtonProps) {
  const listening = state === 'listening';

  return (
    <Button
      className={`h-12 ${listening ? 'bg-danger' : ''}`}
      disabled={busy}
      onClick={listening ? onStop : onStart}
    >
      {listening ? null : <PlayIcon />}
      {LABEL[state]}
    </Button>
  );
}
