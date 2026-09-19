import { uk } from '~/shared/i18n/uk';
import type { Generation, GenerationMode } from '~/shared/ipc';
import { formatDateTime } from '~/shared/lib/format';

export interface AnswerListProps {
  generations: Generation[];
}

const MODE: Record<GenerationMode, string> = {
  reply: uk.answer.title,
  alternative: uk.answer.alternative,
};

export function AnswerList({ generations }: AnswerListProps) {
  if (generations.length === 0) {
    return <p className="text-body text-ink-tertiary">{uk.history.noAnswers}</p>;
  }

  return (
    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
      {generations.map((generation) => (
        <article key={generation.id} className="flex flex-col gap-1">
          <span className="text-caption tracking-wide text-ink-tertiary uppercase">
            {MODE[generation.mode]} · {formatDateTime(generation.createdAt)}
            {generation.hasScreenshot ? ` · ${uk.answer.withScreenshot}` : ''}
          </span>
          <p className="text-body whitespace-pre-wrap text-ink-primary">
            {generation.output}
          </p>
        </article>
      ))}
    </div>
  );
}
