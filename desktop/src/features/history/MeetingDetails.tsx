import { uk } from '~/shared/i18n/uk';
import type { MeetingDetails as Details } from '~/shared/ipc';
import { formatDateTime } from '~/shared/lib/format';
import { Panel, SectionLabel } from '~/shared/ui';
import { AnswerList } from './AnswerList';
import { SegmentList } from './SegmentList';
import { UsageSummary } from './UsageSummary';

export interface MeetingDetailsProps {
  details: Details;
}

/// Each part of a past meeting is its own card: the overview is read, the
/// transcript is scanned and the answers are picked from, and running them
/// together made the page one grey wall.
export function MeetingDetails({ details }: MeetingDetailsProps) {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <Panel title={details.title ?? uk.profile[details.profile]}>
        <p className="text-caption text-ink-tertiary">
          {formatDateTime(details.startedAt)} · {uk.language[details.language]}
        </p>
        <SectionLabel>{uk.history.summary}</SectionLabel>
        <p className="text-body text-ink-secondary">
          {details.overview ?? uk.history.noSummary}
        </p>
      </Panel>

      <Panel title={uk.history.transcript}>
        <SegmentList segments={details.segments} />
      </Panel>

      <Panel title={uk.history.answers}>
        <AnswerList generations={details.generations} />
      </Panel>

      <Panel title={uk.history.usage}>
        <UsageSummary usage={details.usage} />
      </Panel>
    </div>
  );
}
