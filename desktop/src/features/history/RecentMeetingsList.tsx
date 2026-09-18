import { uk } from '~/shared/i18n/uk';
import type { Meeting } from '~/shared/ipc';
import { ChevronRightIcon } from '~/shared/ui';
import { RecentMeetingRow } from './RecentMeetingRow';

export interface RecentMeetingsListProps {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onOpenAll: () => void;
}

const RECENT_LIMIT = 6;

export function RecentMeetingsList({
  meetings,
  loading,
  error,
  onOpen,
  onOpenAll,
}: RecentMeetingsListProps) {
  return (
    <section className="flex min-w-0 flex-grow flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-separator px-5">
        <h2 className="text-headline text-ink-primary">{uk.history.recent}</h2>
        <button
          type="button"
          onClick={onOpenAll}
          className="flex items-center gap-1 p-1 text-body-emphasized text-accent"
        >
          {uk.history.all}
          <ChevronRightIcon />
        </button>
      </header>

      <div className="flex flex-grow flex-col gap-2 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-body text-ink-tertiary">{uk.history.loading}</p>
        ) : null}

        {!loading && meetings.length === 0 ? (
          <p className="text-body text-ink-tertiary">{uk.history.empty}</p>
        ) : null}

        {meetings.slice(0, RECENT_LIMIT).map((meeting) => (
          <RecentMeetingRow key={meeting.id} meeting={meeting} onOpen={onOpen} />
        ))}

        {error ? <p className="text-body text-danger">{error}</p> : null}
      </div>
    </section>
  );
}
