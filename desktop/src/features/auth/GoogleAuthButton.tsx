import { uk } from '~/shared/i18n/uk';
import { Button, ClockIcon } from '~/shared/ui';

export interface GoogleAuthButtonProps {
  opening: boolean;
  onSignIn: () => void;
}

export function GoogleAuthButton({ opening, onSignIn }: GoogleAuthButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="h-11" disabled={opening} onClick={onSignIn}>
        <ClockIcon className="text-ink-secondary" />
        {opening ? uk.auth.opening : uk.auth.google}
      </Button>
      <span className="text-center text-caption text-ink-tertiary">
        {uk.auth.googleHint}
      </span>
    </div>
  );
}
