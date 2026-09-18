import { ResponseOverlay } from '~/features/generation/ResponseOverlay';
import { useAnswer } from '~/features/generation/useAnswer';
import { useListeningState } from '~/features/generation/useListeningState';
import { useSettings } from '~/features/settings/useSettings';
import { useSessionEvents } from '~/shared/ipc/useSessionEvents';
import { useSessionStore } from '~/shared/store/sessionStore';

const FALLBACK_HOTKEY = 'Alt+R';

export function OverlayApp() {
  const answer = useAnswer();
  const listening = useListeningState();
  const settings = useSettings(false);
  const lines = useSessionStore((store) => store.lines);

  useSessionEvents();

  return (
    <ResponseOverlay
      listening={listening}
      hotkey={settings.local?.hotkeys.reply ?? FALLBACK_HOTKEY}
      lines={lines}
      text={answer.text}
      streaming={answer.streaming}
      error={answer.error}
      copied={answer.copied}
      onCopy={answer.copy}
      onRegenerate={answer.regenerate}
    />
  );
}
