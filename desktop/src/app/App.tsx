import { useCallback, useState } from 'react';
import { SignInScreen } from '~/features/auth/SignInScreen';
import { useAuth } from '~/features/auth/useAuth';
import { SessionPanel } from '~/features/session/SessionPanel';
import { useSession } from '~/features/session/useSession';
import { LocalSettingsPanel } from '~/features/settings/LocalSettingsPanel';
import { UserSettingsPanel } from '~/features/settings/UserSettingsPanel';
import { useSettings } from '~/features/settings/useSettings';
import { TranscriptPanel } from '~/features/transcript/TranscriptPanel';
import { uk } from '~/shared/i18n/uk';
import { useAppEvents } from '~/shared/ipc/useAppEvents';
import { useSessionStore } from '~/shared/store/sessionStore';
import { Button } from '~/shared/ui';

export function App() {
  const auth = useAuth();
  const settings = useSettings(auth.signedIn);
  const session = useSession();
  const lines = useSessionStore((store) => store.lines);
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
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{uk.appName}</h1>
            <p className="text-sm text-neutral-400">
              {uk.auth.signedInAs} {auth.profileEmail}
            </p>
          </div>
          <Button variant="ghost" onClick={auth.signOut}>
            {uk.auth.signOut}
          </Button>
        </header>

        <SessionPanel
          state={session.state}
          busy={session.busy}
          notice={session.notice}
          error={session.error}
          defaults={settings.user}
          onStart={session.start}
          onStop={session.stop}
        />

        <TranscriptPanel lines={lines} />

        {settings.local ? (
          <LocalSettingsPanel
            settings={settings.local}
            onSave={settings.saveLocal}
            onTestConnection={settings.testConnection}
          />
        ) : null}

        {settings.user ? (
          <UserSettingsPanel settings={settings.user} onSave={settings.saveUser} />
        ) : null}

        {settings.status ? (
          <p className="text-sm text-emerald-400">{settings.status}</p>
        ) : null}
        {(settings.error ?? eventError) ? (
          <p className="text-sm text-red-400">{settings.error ?? eventError}</p>
        ) : null}
      </div>
    </main>
  );
}
