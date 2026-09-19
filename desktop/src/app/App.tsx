import { useCallback, useState } from 'react';
import { SignInScreen } from '~/features/auth/SignInScreen';
import { useAuth } from '~/features/auth/useAuth';
import { useSettings } from '~/features/settings/useSettings';
import { uk } from '~/shared/i18n/uk';
import { useAppEvents } from '~/shared/ipc/useAppEvents';
import { useTransientMessage } from '~/shared/lib/useTransientMessage';
import { ChatScreen } from './ChatScreen';
import { MainWindow } from './MainWindow';
import { MeetingScreen } from './MeetingScreen';
import { SettingsScreen } from './SettingsScreen';
import { TitleBar } from './TitleBar';

type View =
  | { name: 'main' }
  | { name: 'meeting'; meetingId: string }
  | { name: 'chat'; meetingId: string; chatId: string }
  | { name: 'settings' };

const TITLE: Record<View['name'], string> = {
  main: uk.appName,
  meeting: uk.meeting.title,
  chat: uk.chat.pageTitle,
  settings: uk.nav.settings,
};

/// Every screen but the first one goes back somewhere, and a chat goes back to
/// the meeting it belongs to rather than all the way out.
function previous(view: View): View | null {
  if (view.name === 'main') {
    return null;
  }

  return view.name === 'chat'
    ? { name: 'meeting', meetingId: view.meetingId }
    : { name: 'main' };
}

export function App() {
  const auth = useAuth();
  const settings = useSettings(auth.signedIn);
  const [view, setView] = useState<View>({ name: 'main' });
  const [eventError, showEventError] = useTransientMessage();

  useAppEvents(showEventError);

  const back = previous(view);

  const leaveRemovedChat = useCallback((chatId: string) => {
    setView((current) =>
      current.name === 'chat' && current.chatId === chatId
        ? { name: 'meeting', meetingId: current.meetingId }
        : current,
    );
  }, []);

  if (!auth.ready || !settings.local) {
    return <main className="h-full bg-surface-primary" />;
  }

  if (!auth.signedIn) {
    return (
      <SignInScreen
        submitting={auth.submitting}
        opening={auth.opening}
        error={auth.error ?? eventError}
        onSubmit={auth.signInWithPassword}
        onSignIn={auth.signIn}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface-primary text-ink-primary">
      <TitleBar
        title={TITLE[view.name]}
        onBack={
          back
            ? () => {
                setView(back);
              }
            : null
        }
        onOpenSettings={() => {
          setView({ name: 'settings' });
        }}
      />

      {view.name === 'main' ? (
        <MainWindow
          defaults={settings.user}
          onRemember={settings.saveUser}
          hotkeys={settings.local.hotkeys}
          onOpenMeeting={(meetingId) => {
            setView({ name: 'meeting', meetingId });
          }}
        />
      ) : null}

      {view.name === 'meeting' ? (
        <MeetingScreen
          meetingId={view.meetingId}
          onOpenChat={(chatId) => {
            setView({ name: 'chat', meetingId: view.meetingId, chatId });
          }}
          onChatRemoved={leaveRemovedChat}
        />
      ) : null}

      {view.name === 'chat' ? (
        <ChatScreen
          meetingId={view.meetingId}
          chatId={view.chatId}
          onOpenChat={(chatId) => {
            setView({ name: 'chat', meetingId: view.meetingId, chatId });
          }}
          onChatRemoved={leaveRemovedChat}
        />
      ) : null}

      {view.name === 'settings' ? (
        <SettingsScreen
          local={settings.local}
          user={settings.user}
          status={settings.status}
          email={auth.profileEmail}
          onSaveLocal={settings.saveLocal}
          onSaveUser={settings.saveUser}
          onTestConnection={settings.testConnection}
          onSignOut={auth.signOut}
        />
      ) : null}

      {(settings.error ?? eventError) ? (
        <p className="px-5 pb-3 text-body text-danger">{settings.error ?? eventError}</p>
      ) : null}
    </div>
  );
}
