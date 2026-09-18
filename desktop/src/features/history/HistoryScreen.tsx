import { uk } from '~/shared/i18n/uk';
import { Button, Panel } from '~/shared/ui';
import { MeetingDetailsPanel } from './MeetingDetailsPanel';
import { MeetingList } from './MeetingList';
import { useHistory } from './useHistory';

export function HistoryScreen() {
  const history = useHistory();

  return (
    <>
      <Panel title={uk.history.title}>
        {history.loading ? (
          <p className="text-sm text-neutral-500">{uk.history.loading}</p>
        ) : null}

        {!history.loading && history.meetings.length === 0 ? (
          <p className="text-sm text-neutral-500">{uk.history.empty}</p>
        ) : (
          <MeetingList
            meetings={history.meetings}
            selectedId={history.selectedId}
            onSelect={history.select}
          />
        )}

        <div>
          <Button variant="ghost" onClick={history.reload}>
            {uk.history.refresh}
          </Button>
        </div>

        {history.error ? <p className="text-sm text-red-400">{history.error}</p> : null}
      </Panel>

      {history.details ? (
        <MeetingDetailsPanel details={history.details} />
      ) : (
        <p className="text-sm text-neutral-500">{uk.history.pick}</p>
      )}
    </>
  );
}
