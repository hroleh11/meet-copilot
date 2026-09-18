import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { formatDateTime } from '~/shared/lib/format';

export interface MeetingListProps {
  meetings: Meeting[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MeetingList({ meetings, selectedId, onSelect }: MeetingListProps) {
  return (
    <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <button
            type="button"
            aria-current={meeting.id === selectedId}
            onClick={() => {
              onSelect(meeting.id);
            }}
            className={`w-full rounded-md px-3 py-2 text-left transition ${
              meeting.id === selectedId
                ? 'bg-surface-secondary'
                : 'hover:bg-surface-secondary'
            }`}
          >
            <span className="block text-body text-ink-primary">
              {meeting.title ?? uk.profile[meeting.profile]}
            </span>
            <span className="block text-caption text-ink-tertiary">
              {formatDateTime(meeting.startedAt)}
              {meeting.status === 'live' ? ` · ${uk.history.live}` : ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
