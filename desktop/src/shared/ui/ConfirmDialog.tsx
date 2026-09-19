import { useEffect, useRef } from 'react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/// A native `<dialog>` would bring the top layer and Escape for free, but it is
/// driven imperatively and is missing from the test environment, so the sheet is
/// an ordinary overlay that answers Escape itself.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirm.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      onMouseDown={onCancel}
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-6 backdrop-blur-sm"
    >
      <div
        role="alertdialog"
        aria-label={title}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        className="flex w-full max-w-[380px] flex-col gap-4 rounded-lg border border-separator bg-surface-elevated p-5 shadow-2xl"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-headline text-ink-primary">{title}</h2>
          <p className="text-body text-ink-secondary">{description}</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" className="h-9" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirm}
            type="button"
            variant="danger"
            className="h-9"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
