import { RecentMeetingsList } from '~/features/history/RecentMeetingsList';
import { useHistory } from '~/features/history/useHistory';
import { SessionSidebar } from '~/features/session/SessionSidebar';
import { useMeetingSetup } from '~/features/session/useMeetingSetup';
import { useSession } from '~/features/session/useSession';
import type { UserSettings } from '~/shared/ipc';

export interface MainWindowProps {
  defaults: UserSettings | null;
  hotkey: string;
  onOpenMeeting: (id: string) => void;
  onOpenAll: () => void;
}

export function MainWindow({
  defaults,
  hotkey,
  onOpenMeeting,
  onOpenAll,
}: MainWindowProps) {
  const session = useSession();
  const setup = useMeetingSetup(defaults);
  const history = useHistory();

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
        meetings={history.meetings}
        loading={history.loading}
        error={history.error}
        onOpen={onOpenMeeting}
        onOpenAll={onOpenAll}
      />
    </div>
  );
}
