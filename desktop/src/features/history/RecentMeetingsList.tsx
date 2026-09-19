import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { ConfirmDialog } from '~/shared/ui';
import { RecentMeetingRow } from './RecentMeetingRow';
import { useEndOfList } from './useEndOfList';

export interface RecentMeetingsListProps {
  title: string;
  meetings: Meeting[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onReachEnd: () => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
}

export function RecentMeetingsList({
  title,
  meetings,
  loading,
  loadingMore,
  error,
  onOpen,
  onReachEnd,
  onRename,
  onRemove,
}: RecentMeetingsListProps) {
  const onScroll = useEndOfList(onReachEnd);
  const [removing, setRemoving] = useState<Meeting | null>(null);

  return (
    <section className="flex min-h-0 min-w-0 flex-grow flex-col">
      <header className="flex h-14 shrink-0 items-center border-b border-separator px-5">
        <h2 className="text-headline text-ink-primary">{title}</h2>
      </header>

      <div
        onScroll={onScroll}
        className="flex flex-grow flex-col gap-2 overflow-y-auto px-5 py-4"
      >
        {loading ? (
          <p className="text-body text-ink-tertiary">{uk.history.loading}</p>
        ) : null}

        {!loading && meetings.length === 0 ? (
          <p className="text-body text-ink-tertiary">{uk.history.empty}</p>
        ) : null}

        {meetings.map((meeting) => (
          <RecentMeetingRow
            key={meeting.id}
            meeting={meeting}
            onOpen={onOpen}
            onRename={(next) => {
              onRename(meeting.id, next);
            }}
            onRemove={() => {
              setRemoving(meeting);
            }}
          />
        ))}

        {loadingMore ? (
          <p className="text-caption text-ink-tertiary">{uk.history.loading}</p>
        ) : null}

        {error ? <p className="text-body text-danger">{error}</p> : null}
      </div>

      {removing ? (
        <ConfirmDialog
          title={uk.history.deleteTitle}
          description={uk.history.deleteHint.replace(
            '{title}',
            removing.title ?? uk.profile[removing.profile],
          )}
          confirmLabel={uk.history.confirm}
          cancelLabel={uk.history.cancel}
          onConfirm={() => {
            onRemove(removing.id);
            setRemoving(null);
          }}
          onCancel={() => {
            setRemoving(null);
          }}
        />
      ) : null}
    </section>
  );
}
