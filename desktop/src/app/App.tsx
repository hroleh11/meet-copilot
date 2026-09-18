import { useCallback, useState } from 'react';
import { SignInScreen } from '~/features/auth/SignInScreen';
import { useAuth } from '~/features/auth/useAuth';
import { HistoryScreen } from '~/features/history/HistoryScreen';
import { useSettings } from '~/features/settings/useSettings';
import { uk } from '~/shared/i18n/uk';
import { useAppEvents } from '~/shared/ipc/useAppEvents';
import { MainWindow } from './MainWindow';
import { SettingsScreen } from './SettingsScreen';
import { TitleBar } from './TitleBar';

type View =
  { name: 'main' } | { name: 'history'; meetingId: string | null } | { name: 'settings' };

const TITLE: Record<View['name'], string> = {
  main: uk.appName,
  history: uk.history.title,
  settings: uk.nav.settings,
};

export function App() {
  const auth = useAuth();
  const settings = useSettings(auth.signedIn);
  const [view, setView] = useState<View>({ name: 'main' });
  const [eventError, setEventError] = useState<string | null>(null);

  useAppEvents(useCallback((message: string) => setEventError(message), []));

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
          view.name === 'main'
            ? null
            : () => {
                setView({ name: 'main' });
              }
        }
        onOpenSettings={() => {
          setView({ name: 'settings' });
        }}
      />

      {view.name === 'main' ? (
        <MainWindow
          defaults={settings.user}
          hotkey={settings.local.hotkeys.reply}
          onOpenMeeting={(meetingId) => {
            setView({ name: 'history', meetingId });
          }}
          onOpenAll={() => {
            setView({ name: 'history', meetingId: null });
          }}
        />
      ) : null}

      {view.name === 'history' ? (
        <div className="min-h-0 flex-grow overflow-y-auto p-5">
          <HistoryScreen initialMeetingId={view.meetingId} />
        </div>
      ) : null}

      {view.name === 'settings' ? (
        <div className="min-h-0 flex-grow overflow-y-auto p-5">
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
        </div>
      ) : null}

      {(settings.error ?? eventError) ? (
        <p className="px-5 pb-3 text-body text-danger">{settings.error ?? eventError}</p>
      ) : null}
    </div>
  );
}
