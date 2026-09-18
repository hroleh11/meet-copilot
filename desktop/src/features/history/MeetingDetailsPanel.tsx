import { uk } from '~/shared/i18n/uk';
import type { MeetingDetails } from '~/shared/ipc';
import { formatDateTime } from '~/shared/lib/format';
import { Panel } from '~/shared/ui';
import { AnswerList } from './AnswerList';
import { SegmentList } from './SegmentList';
import { UsageSummary } from './UsageSummary';

export interface MeetingDetailsPanelProps {
  details: MeetingDetails;
}

export function MeetingDetailsPanel({ details }: MeetingDetailsPanelProps) {
  return (
    <Panel title={details.title ?? uk.profile[details.profile]}>
      <p className="text-caption text-ink-tertiary">
        {formatDateTime(details.startedAt)} · {uk.language[details.language]}
      </p>

      {details.summary ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-caption tracking-wide text-ink-tertiary uppercase">
            {uk.history.summary}
          </h3>
          <p className="text-body text-ink-secondary">{details.summary}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-caption tracking-wide text-ink-tertiary uppercase">
          {uk.history.transcript}
        </h3>
        <SegmentList segments={details.segments} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-caption tracking-wide text-ink-tertiary uppercase">
          {uk.history.answers}
        </h3>
        <AnswerList generations={details.generations} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-caption tracking-wide text-ink-tertiary uppercase">
          {uk.history.usage}
        </h3>
        <UsageSummary usage={details.usage} />
      </section>
    </Panel>
  );
}
