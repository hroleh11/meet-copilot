import { useEffect, useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { ResourceContent } from '~/shared/ipc';
import { resourceContent } from '~/shared/ipc/commands';
import { errorMessage } from '~/shared/lib/command-error';
import { Button } from '~/shared/ui';

export interface ResourceViewerProps {
  resourceId: string;
  name: string;
  onClose: () => void;
}

/// What the copilot reads is the text, not the file, so this shows the text. When
/// a document was too long for its level, the compressed version is what actually
/// travels, and both are here so it is clear which one the model sees.
export function ResourceViewer({ resourceId, name, onClose }: ResourceViewerProps) {
  const [content, setContent] = useState<ResourceContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let wanted = true;

    resourceContent(resourceId)
      .then((found) => {
        if (wanted) {
          setContent(found);
        }
      })
      .catch((cause: unknown) => {
        if (wanted) {
          setError(errorMessage(cause, uk.errors.resources));
        }
      });

    return () => {
      wanted = false;
    };
  }, [resourceId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const shown = content?.digest ?? content?.text ?? '';

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-6 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-label={name}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        className="flex max-h-full w-full max-w-[720px] flex-col gap-3 rounded-lg border border-separator bg-surface-elevated p-5 shadow-2xl"
      >
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="min-w-0 truncate text-headline text-ink-primary">{name}</h2>
          {content ? (
            <span className="shrink-0 text-caption text-ink-tertiary">
              {uk.resources.chars.replace('{count}', String(content.chars))}
            </span>
          ) : null}
        </header>

        {content?.digest ? (
          <p className="text-caption text-ink-tertiary">{uk.resources.digestNote}</p>
        ) : null}

        {error ? <p className="text-body text-danger">{error}</p> : null}

        <pre className="min-h-0 flex-grow overflow-auto whitespace-pre-wrap rounded-md border border-separator bg-surface-primary p-3 text-body text-ink-secondary">
          {content ? shown || uk.resources.nothingRead : uk.resources.reading}
        </pre>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" className="h-9" onClick={onClose}>
            {uk.resources.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
