import { RecentMeetingsList } from '~/features/history/RecentMeetingsList';
import { useMeetings } from '~/features/history/useMeetings';
import { SessionSidebar } from '~/features/session/SessionSidebar';
import { useMeetingSetup } from '~/features/session/useMeetingSetup';
import { useSession } from '~/features/session/useSession';
import type { UserSettings } from '~/shared/ipc';

export interface MainWindowProps {
  defaults: UserSettings | null;
  onRemember: (settings: UserSettings) => void;
  hotkey: string;
  onOpenMeeting: (id: string) => void;
}

export function MainWindow({
  defaults,
  onRemember,
  hotkey,
  onOpenMeeting,
}: MainWindowProps) {
  const session = useSession();
  const setup = useMeetingSetup(defaults, onRemember);
  const meetings = useMeetings();

  return (
    <div className="flex min-h-0 flex-grow">
      <SessionSidebar
        profile={setup.profile}
        language={setup.language}
        state={session.state}
        busy={session.busy}
        hotkey={hotkey}
        notice={session.notice}
        error={session.error}
        onProfileChange={setup.setProfile}
        onLanguageChange={setup.setLanguage}
        onStart={() => {
          session.start(setup.profile, setup.language);
        }}
        onStop={session.stop}
      />

      <RecentMeetingsList
        meetings={meetings.meetings}
        loading={meetings.loading}
        loadingMore={meetings.loadingMore}
        error={meetings.error}
        onOpen={onOpenMeeting}
        onReachEnd={meetings.loadMore}
      />
    </div>
  );
}
