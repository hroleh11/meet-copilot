import { useCallback, useState } from 'react';
import { SignInScreen } from '~/features/auth/SignInScreen';
import { useAuth } from '~/features/auth/useAuth';
import { HistoryScreen } from '~/features/history/HistoryScreen';
import { useSettings } from '~/features/settings/useSettings';
import { useAppEvents } from '~/shared/ipc/useAppEvents';
import { AppHeader } from './AppHeader';
import type { Tab } from './AppHeader';
import { MeetingScreen } from './MeetingScreen';
import { SettingsScreen } from './SettingsScreen';

export function App() {
  const auth = useAuth();
  const settings = useSettings(auth.signedIn);
  const [tab, setTab] = useState<Tab>('meeting');
  const [eventError, setEventError] = useState<string | null>(null);

  useAppEvents(useCallback((message: string) => setEventError(message), []));

  if (!auth.ready) {
    return <main className="h-full bg-neutral-950" />;
  }

  if (!auth.signedIn) {
    return (
      <SignInScreen
        opening={auth.opening}
        error={auth.error ?? eventError}
        onSignIn={auth.signIn}
      />
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-8 py-10">
        <AppHeader
          email={auth.profileEmail}
          tab={tab}
          onTab={setTab}
          onSignOut={auth.signOut}
        />

        {tab === 'meeting' ? <MeetingScreen defaults={settings.user} /> : null}
        {tab === 'history' ? <HistoryScreen /> : null}
        {tab === 'settings' ? (
          <SettingsScreen
            local={settings.local}
            user={settings.user}
            status={settings.status}
            onSaveLocal={settings.saveLocal}
            onSaveUser={settings.saveUser}
            onTestConnection={settings.testConnection}
          />
        ) : null}

        {(settings.error ?? eventError) ? (
          <p className="text-sm text-red-400">{settings.error ?? eventError}</p>
        ) : null}
      </div>
    </main>
  );
}
