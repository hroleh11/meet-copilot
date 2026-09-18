import { uk } from '~/shared/i18n/uk';
import { AppMark } from './AppMark';
import { GoogleAuthButton } from './GoogleAuthButton';
import { LoginForm } from './LoginForm';

export interface SignInScreenProps {
  submitting: boolean;
  opening: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
  onSignIn: () => void;
}

export function SignInScreen({
  submitting,
  opening,
  error,
  onSubmit,
  onSignIn,
}: SignInScreenProps) {
  return (
    <main className="flex h-full items-center justify-center bg-surface-primary">
      <div className="flex w-80 flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-3">
          <AppMark />
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-title text-ink-primary">{uk.appName}</h1>
            <p className="text-body text-ink-secondary">{uk.auth.tagline}</p>
          </div>
        </div>

        <LoginForm submitting={submitting} onSubmit={onSubmit} />

        <div className="flex w-full items-center gap-3">
          <span className="h-px flex-grow bg-separator" />
          <span className="text-caption text-ink-tertiary">{uk.auth.or}</span>
          <span className="h-px flex-grow bg-separator" />
        </div>

        <div className="w-full">
          <GoogleAuthButton opening={opening} onSignIn={onSignIn} />
        </div>

        {error ? <p className="text-body text-danger">{error}</p> : null}
      </div>
    </main>
  );
}
