import { uk } from '~/shared/i18n/uk';
import { Button, RefreshIcon } from '~/shared/ui';

export interface RegenerateButtonProps {
  disabled: boolean;
  onRegenerate: () => void;
}

export function RegenerateButton({ disabled, onRegenerate }: RegenerateButtonProps) {
  return (
    <Button
      variant="secondary"
      className="h-8 flex-grow bg-transparent"
      disabled={disabled}
      onClick={onRegenerate}
    >
      <RefreshIcon />
      {uk.answer.alternative}
    </Button>
  );
}
