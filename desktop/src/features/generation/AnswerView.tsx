import { uk } from '~/shared/i18n/uk';
import type { GenerationMode } from '~/shared/ipc';
import { Button } from '~/shared/ui';

export interface AnswerViewProps {
  mode: GenerationMode | null;
  text: string;
  streaming: boolean;
  error: string | null;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

export function AnswerView({
  mode,
  text,
  streaming,
  error,
  copied,
  onCopy,
  onClose,
}: AnswerViewProps) {
  return (
    <main className="flex h-screen flex-col gap-3 bg-neutral-950 p-4 text-neutral-100">
      <header className="flex items-center justify-between gap-3">
        <span className="text-xs tracking-wide text-neutral-400 uppercase">
          {mode === 'alternative' ? uk.answer.alternative : uk.answer.reply}
          {streaming ? ` · ${uk.answer.writing}` : ''}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCopy} disabled={text.length === 0}>
            {copied ? uk.answer.copied : uk.answer.copy}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {uk.answer.close}
          </Button>
        </div>
      </header>

      <p className="flex-1 overflow-y-auto text-lg leading-relaxed whitespace-pre-wrap">
        {text.length === 0 && !error ? (
          <span className="text-neutral-500">{uk.answer.waiting}</span>
        ) : (
          text
        )}
      </p>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </main>
  );
}
