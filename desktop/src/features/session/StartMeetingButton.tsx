import { uk } from '~/shared/i18n/uk';
import type { SessionState } from '~/shared/ipc';
import { formatShortcut } from '~/shared/lib/shortcut';
import { Button, PlayIcon } from '~/shared/ui';

export interface StartMeetingButtonProps {
  state: SessionState;
  busy: boolean;
  hotkey: string;
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
  hotkey,
  onStart,
  onStop,
}: StartMeetingButtonProps) {
  const listening = state === 'listening';

  return (
    <div className="flex flex-col gap-2">
      <Button
        className={`h-12 ${listening ? 'bg-danger' : ''}`}
        disabled={busy}
        onClick={listening ? onStop : onStart}
      >
        {listening ? null : <PlayIcon />}
        {LABEL[state]}
      </Button>
      <span className="text-center text-caption text-ink-tertiary">
        {uk.meeting.hotkeyHint.replace('{hotkey}', formatShortcut(hotkey))}
      </span>
    </div>
  );
}
