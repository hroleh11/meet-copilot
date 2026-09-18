import { uk } from '~/shared/i18n/uk';
import { formatShortcut } from '~/shared/lib/shortcut';
import type { TranscriptLine } from '~/shared/store/sessionStore';
import { SectionLabel } from '~/shared/ui';
import { CopyButton } from './CopyButton';
import { LiveTranscript } from './LiveTranscript';
import { RegenerateButton } from './RegenerateButton';
import { ResponseBlock } from './ResponseBlock';
import { StatusIndicator } from './StatusIndicator';
import type { ListeningState } from './StatusIndicator';

export interface ResponseOverlayProps {
  listening: ListeningState;
  hotkey: string;
  lines: TranscriptLine[];
  text: string;
  streaming: boolean;
  error: string | null;
  copied: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
}

export function ResponseOverlay({
  listening,
  hotkey,
  lines,
  text,
  streaming,
  error,
  copied,
  onCopy,
  onRegenerate,
}: ResponseOverlayProps) {
  return (
    <main className="flex h-screen flex-col gap-3 rounded-lg border border-separator bg-surface-elevated/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-[30px] backdrop-saturate-[1.8]">
      <header className="flex items-center justify-between">
        <StatusIndicator state={listening} />
        <span className="rounded-sm bg-ink-secondary/15 px-2 py-0.5 text-caption text-ink-secondary">
          {formatShortcut(hotkey)}
        </span>
      </header>

      <span className="h-px bg-separator" />

      <section className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        <SectionLabel>{uk.answer.transcript}</SectionLabel>
        <LiveTranscript lines={lines} />
      </section>

      <span className="h-px bg-separator" />

      <section className="flex min-h-0 flex-grow flex-col gap-1 overflow-y-auto">
        <SectionLabel>{uk.answer.title}</SectionLabel>
        <ResponseBlock text={text} streaming={streaming} error={error} />
      </section>

      <footer className="flex gap-2">
        <CopyButton disabled={text.length === 0} copied={copied} onCopy={onCopy} />
        <RegenerateButton disabled={streaming} onRegenerate={onRegenerate} />
      </footer>
    </main>
  );
}
