import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { RecentMeetingRow } from './RecentMeetingRow';
import { useEndOfList } from './useEndOfList';

export interface RecentMeetingsListProps {
  meetings: Meeting[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onReachEnd: () => void;
}

export function RecentMeetingsList({
  meetings,
  loading,
  loadingMore,
  error,
  onOpen,
  onReachEnd,
}: RecentMeetingsListProps) {
  const onScroll = useEndOfList(onReachEnd);

  return (
    <section className="flex min-w-0 flex-grow flex-col">
      <header className="flex h-14 shrink-0 items-center border-b border-separator px-5">
        <h2 className="text-headline text-ink-primary">{uk.history.recent}</h2>
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
          <RecentMeetingRow key={meeting.id} meeting={meeting} onOpen={onOpen} />
        ))}

        {loadingMore ? (
          <p className="text-caption text-ink-tertiary">{uk.history.loading}</p>
        ) : null}

        {error ? <p className="text-body text-danger">{error}</p> : null}
      </div>
    </section>
  );
}
