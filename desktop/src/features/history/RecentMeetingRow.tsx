import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { ChevronRightIcon } from '~/shared/ui';
import { meetingMeta } from './meetingMeta';

export interface RecentMeetingRowProps {
  meeting: Meeting;
  onOpen: (id: string) => void;
}

export function RecentMeetingRow({ meeting, onOpen }: RecentMeetingRowProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(meeting.id);
      }}
      className="flex items-center gap-3 rounded-md border border-separator bg-surface-elevated p-3 text-left transition hover:brightness-95"
    >
      <span className="shrink-0 rounded-sm bg-surface-primary px-2 py-1 text-caption font-semibold text-ink-secondary">
        {uk.profile[meeting.profile]}
      </span>
      <span className="flex min-w-0 flex-grow flex-col gap-px">
        <span className="truncate text-body-emphasized text-ink-primary">
          {meeting.title ?? uk.profile[meeting.profile]}
        </span>
        <span className="text-caption text-ink-tertiary">{meetingMeta(meeting)}</span>
      </span>
      <ChevronRightIcon size={14} className="shrink-0 text-ink-tertiary" />
    </button>
  );
}
