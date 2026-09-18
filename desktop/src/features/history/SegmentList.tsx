import { uk } from '~/shared/i18n/uk';
import type { Speaker, TranscriptSegment } from '~/shared/ipc';

export interface SegmentListProps {
  segments: TranscriptSegment[];
}

const SPEAKER: Record<Speaker, string> = {
  me: uk.meeting.me,
  other: uk.meeting.other,
};

export function SegmentList({ segments }: SegmentListProps) {
  if (segments.length === 0) {
    return <p className="text-body text-ink-tertiary">{uk.meeting.emptyTranscript}</p>;
  }

  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {segments.map((segment) => (
        <p key={segment.id} className="text-body text-ink-primary">
          <span className="mr-2 text-caption tracking-wide text-ink-tertiary uppercase">
            {SPEAKER[segment.speaker]}
          </span>
          {segment.text}
        </p>
      ))}
    </div>
  );
}
