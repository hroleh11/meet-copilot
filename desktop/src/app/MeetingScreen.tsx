import { SessionPanel } from '~/features/session/SessionPanel';
import { useConnection } from '~/features/session/useConnection';
import { useSession } from '~/features/session/useSession';
import { TranscriptPanel } from '~/features/transcript/TranscriptPanel';
import type { UserSettings } from '~/shared/ipc';
import { useSessionStore } from '~/shared/store/sessionStore';

export interface MeetingScreenProps {
  defaults: UserSettings | null;
}

export function MeetingScreen({ defaults }: MeetingScreenProps) {
  const session = useSession();
  const connection = useConnection();
  const sources = useSessionStore((store) => store.sources);
  const lines = useSessionStore((store) => store.lines);

  return (
    <>
      <SessionPanel
        state={session.state}
        busy={session.busy}
        notice={session.notice}
        error={session.error}
        defaults={defaults}
        sources={sources}
        connection={connection.state}
        onStart={session.start}
        onStop={session.stop}
        onRetryConnection={connection.check}
      />

      <TranscriptPanel lines={lines} />
    </>
  );
}
