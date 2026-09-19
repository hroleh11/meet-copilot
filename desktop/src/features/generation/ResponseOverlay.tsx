import { uk } from '~/shared/i18n/uk';
import { formatShortcut } from '~/shared/lib/shortcut';
import type { TranscriptLine } from '~/shared/store/sessionStore';
import { SectionLabel } from '~/shared/ui';
import { LiveTranscript } from './LiveTranscript';
import { ResponseBlock } from './ResponseBlock';
import { StatusIndicator } from './StatusIndicator';
import type { ListeningState } from './StatusIndicator';
import { useOverlayDrag } from './useOverlayDrag';

export interface ResponseOverlayProps {
  listening: ListeningState;
  hotkey: string;
  interactive: boolean;
  lines: TranscriptLine[];
  text: string;
  withScreenshot: boolean;
  streaming: boolean;
  error: string | null;
}

export function ResponseOverlay({
  listening,
  hotkey,
  interactive,
  lines,
  text,
  withScreenshot,
  streaming,
  error,
}: ResponseOverlayProps) {
  const startDrag = useOverlayDrag();

  return (
    <main
      className={`flex h-screen flex-col gap-3 rounded-lg border bg-surface-elevated/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-[30px] backdrop-saturate-[1.8] ${
        interactive ? 'border-accent' : 'border-separator'
      }`}
    >
      <header
        onPointerDown={startDrag}
        className="flex cursor-grab items-center justify-between active:cursor-grabbing"
      >
        <StatusIndicator state={listening} />
        <span className="rounded-sm bg-ink-secondary/15 px-2 py-0.5 text-caption text-ink-secondary">
          {interactive ? uk.answer.interactive : formatShortcut(hotkey)}
        </span>
      </header>

      <span className="h-px bg-separator" />

      <section className="flex min-h-0 flex-grow flex-col gap-2">
        <SectionLabel>{uk.answer.transcript}</SectionLabel>
        <LiveTranscript lines={lines} />
      </section>

      <span className="h-px bg-separator" />

      <section className="flex max-h-[45%] min-h-24 flex-col gap-1 overflow-y-auto">
        <span className="flex items-center gap-2">
          <SectionLabel>{uk.answer.title}</SectionLabel>
          {withScreenshot ? (
            <span className="text-caption text-ink-tertiary">
              {uk.answer.withScreenshot}
            </span>
          ) : null}
        </span>
        <ResponseBlock text={text} streaming={streaming} error={error} />
      </section>
    </main>
  );
}
