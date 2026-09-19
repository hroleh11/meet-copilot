import { uk } from '~/shared/i18n/uk';
import type { TranscriptLine } from '~/shared/store/sessionStore';
import { useTranscriptScroll } from './useTranscriptScroll';

export interface LiveTranscriptProps {
  lines: TranscriptLine[];
}

export function LiveTranscript({ lines }: LiveTranscriptProps) {
  const { viewport, visible, onScroll } = useTranscriptScroll(lines.length);
  const shown = lines.slice(-visible);

  return (
    <div
      ref={viewport}
      onScroll={onScroll}
      className="flex min-h-0 flex-grow flex-col gap-2 overflow-y-auto"
    >
      {shown.length === 0 ? (
        <p className="text-body text-ink-tertiary">{uk.meeting.emptyTranscript}</p>
      ) : null}

      {shown.length < lines.length ? (
        <p className="text-caption text-ink-tertiary">{uk.answer.earlierLines}</p>
      ) : null}

      {shown.map((line) => (
        <p key={line.id} className="flex items-start gap-2">
          <span
            className={`mt-px shrink-0 rounded-sm px-1.5 py-0.5 text-caption font-bold uppercase ${
              line.speaker === 'me'
                ? 'bg-accent/15 text-accent'
                : 'bg-ink-secondary/15 text-ink-secondary'
            }`}
          >
            {line.speaker === 'me' ? uk.meeting.me : uk.meeting.other}
          </span>
          <span
            className={`text-body ${
              line.isFinal ? 'text-ink-primary' : 'text-ink-tertiary italic'
            }`}
          >
            {line.text}
          </span>
        </p>
      ))}
    </div>
  );
}
