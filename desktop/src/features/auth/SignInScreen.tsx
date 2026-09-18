import { uk } from '~/shared/i18n/uk';
import { Button } from '~/shared/ui';

export interface SignInScreenProps {
  opening: boolean;
  error: string | null;
  onSignIn: () => void;
}

export function SignInScreen({ opening, error, onSignIn }: SignInScreenProps) {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 bg-neutral-950 px-8 text-neutral-100">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{uk.appName}</h1>
        <p className="text-sm text-neutral-400">{uk.appTagline}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 text-center">
        <h2 className="text-base font-medium">{uk.auth.title}</h2>
        <p className="text-sm text-neutral-400">{uk.auth.explanation}</p>
        <Button onClick={onSignIn} disabled={opening}>
          {opening ? uk.auth.opening : uk.auth.signIn}
        </Button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </main>
  );
}
