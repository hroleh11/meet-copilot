import { useConnection } from '~/features/session/useConnection';
import { AudioField } from '~/features/settings/AudioField';
import { uk } from '~/shared/i18n/uk';
import type { LocalSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button } from '~/shared/ui';
import { OnboardingStep } from './OnboardingStep';

export interface OnboardingScreenProps {
  settings: LocalSettings;
  signedIn: boolean;
  profileEmail: string | null;
  opening: boolean;
  error: string | null;
  onSave: (settings: LocalSettings) => void;
  onSignIn: () => void;
}

const inputClass =
  'w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500';

export function OnboardingScreen({
  settings,
  signedIn,
  profileEmail,
  opening,
  error,
  onSave,
  onSignIn,
}: OnboardingScreenProps) {
  const [backendUrl, setBackendUrl] = useResettableDraft(settings.backendUrl);
  const [inputDevice, setInputDevice] = useResettableDraft(settings.inputDevice);
  const connection = useConnection(settings.backendUrl);

  const serverReady = connection.state === 'reachable';

  return (
    <main className="h-full overflow-y-auto bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-8 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{uk.onboarding.title}</h1>
          <p className="text-sm text-neutral-400">{uk.onboarding.intro}</p>
        </header>

        <OnboardingStep
          title={uk.onboarding.serverStep}
          hint={uk.onboarding.serverHint}
          done={serverReady}
        >
          <input
            value={backendUrl}
            onChange={(event) => {
              setBackendUrl(event.target.value);
            }}
            className={inputClass}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                onSave({ ...settings, backendUrl });
              }}
            >
              {uk.onboarding.serverSave}
            </Button>
            <span
              className={`text-sm ${serverReady ? 'text-emerald-400' : 'text-neutral-400'}`}
            >
              {serverReady ? uk.meeting.connectionOk : uk.meeting.connectionDown}
            </span>
          </div>
        </OnboardingStep>

        <OnboardingStep
          title={uk.onboarding.signInStep}
          hint={uk.onboarding.signInHint}
          done={signedIn}
        >
          {signedIn ? (
            <p className="text-sm text-neutral-300">
              {uk.onboarding.signedIn} {profileEmail}
            </p>
          ) : (
            <div>
              <Button disabled={opening || !serverReady} onClick={onSignIn}>
                {opening ? uk.auth.opening : uk.auth.signIn}
              </Button>
            </div>
          )}
        </OnboardingStep>

        <OnboardingStep
          title={uk.onboarding.audioStep}
          hint={uk.onboarding.audioHint}
          done={false}
        >
          <AudioField deviceId={inputDevice} onDeviceChange={setInputDevice} />
        </OnboardingStep>

        <div className="flex items-center gap-3">
          <Button
            disabled={!serverReady || !signedIn}
            onClick={() => {
              onSave({ ...settings, backendUrl, inputDevice, onboarded: true });
            }}
          >
            {uk.onboarding.finish}
          </Button>
          {!serverReady || !signedIn ? (
            <span className="text-sm text-neutral-500">{uk.onboarding.finishHint}</span>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </main>
  );
}
