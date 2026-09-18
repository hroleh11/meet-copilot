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
    return <p className="text-sm text-neutral-500">{uk.meeting.emptyTranscript}</p>;
  }

  return (
    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {segments.map((segment) => (
        <p key={segment.id} className="text-sm text-neutral-200">
          <span className="mr-2 text-xs tracking-wide text-neutral-500 uppercase">
            {SPEAKER[segment.speaker]}
          </span>
          {segment.text}
        </p>
      ))}
    </div>
  );
}
