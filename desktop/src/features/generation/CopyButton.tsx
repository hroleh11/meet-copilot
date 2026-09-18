import { uk } from '~/shared/i18n/uk';
import { Button, CopyIcon } from '~/shared/ui';

export interface CopyButtonProps {
  disabled: boolean;
  copied: boolean;
  onCopy: () => void;
}

export function CopyButton({ disabled, copied, onCopy }: CopyButtonProps) {
  return (
    <Button className="h-8 flex-grow" disabled={disabled} onClick={onCopy}>
      <CopyIcon />
      {copied ? uk.answer.copied : uk.answer.copy}
    </Button>
  );
}
