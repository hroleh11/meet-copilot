import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { useMeetingDrag } from '~/shared/lib/meetingDrag';
import { useRename } from '~/shared/lib/useRename';
import { ChevronRightIcon, PencilIcon, TextInput, TrashIcon } from '~/shared/ui';
import { meetingMeta } from './meetingMeta';

export interface RecentMeetingRowProps {
  meeting: Meeting;
  onOpen: (id: string) => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}

export function RecentMeetingRow({
  meeting,
  onOpen,
  onRename,
  onRemove,
}: RecentMeetingRowProps) {
  const title = meeting.title ?? uk.profile[meeting.profile];
  const drag = useMeetingDrag(meeting.id);
  const rename = useRename(title, onRename);

  return (
    <div
      {...(rename.editing ? {} : drag)}
      className="group flex items-center gap-3 rounded-md border border-separator bg-surface-elevated p-3 transition hover:brightness-95"
    >
      <span className="shrink-0 rounded-sm bg-surface-primary px-2 py-1 text-caption font-semibold text-ink-secondary">
        {uk.profile[meeting.profile]}
      </span>

      {rename.editing ? (
        <TextInput
          autoFocus
          value={rename.draft}
          aria-label={uk.history.rename}
          tone="recessed"
          onChange={(event) => {
            rename.change(event.target.value);
          }}
          onKeyDown={rename.onKeyDown}
          onBlur={rename.commit}
          className="min-w-0 flex-grow"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            onOpen(meeting.id);
          }}
          className="flex min-w-0 flex-grow flex-col gap-px text-left"
        >
          <span className="truncate text-body-emphasized text-ink-primary">{title}</span>
          <span className="text-caption text-ink-tertiary">{meetingMeta(meeting)}</span>
        </button>
      )}

      {rename.editing ? null : (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={uk.history.rename}
            onClick={rename.start}
            className="rounded-sm p-1 text-ink-tertiary opacity-0 transition group-hover:opacity-100 hover:text-ink-primary focus-visible:opacity-100"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            aria-label={uk.history.delete}
            onClick={onRemove}
            className="rounded-sm p-1 text-ink-tertiary opacity-0 transition group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
          >
            <TrashIcon />
          </button>
          <ChevronRightIcon size={14} className="text-ink-tertiary" />
        </span>
      )}
    </div>
  );
}
