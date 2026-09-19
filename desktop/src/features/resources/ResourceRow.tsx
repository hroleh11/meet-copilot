import { uk } from '~/shared/i18n/uk';
import type { Resource, ResourceFailure } from '~/shared/ipc';
import { TrashIcon } from '~/shared/ui';

export interface ResourceRowProps {
  resource: Resource;
  onOpen?: (resource: Resource) => void;
  onRemove?: (id: string) => void;
}

const KILOBYTE = 1024;

function reason(failure: ResourceFailure | null): string {
  return failure ? uk.resources.failures[failure] : uk.resources.failed;
}

function size(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / KILOBYTE))} КБ`;
}

function state(resource: Resource): { text: string; tone: string } {
  if (resource.status === 'pending') {
    return { text: uk.resources.pending, tone: 'text-ink-tertiary' };
  }

  if (resource.status === 'failed') {
    return { text: reason(resource.failure), tone: 'text-danger' };
  }

  return { text: size(resource.byteSize), tone: 'text-ink-tertiary' };
}

export function ResourceRow({ resource, onOpen, onRemove }: ResourceRowProps) {
  const status = state(resource);
  const readable = resource.status === 'ready' && onOpen !== undefined;

  return (
    <li className="flex items-center gap-3 border-b border-separator px-4 py-2 last:border-b-0">
      {readable ? (
        <button
          type="button"
          title={uk.resources.open}
          onClick={() => {
            onOpen(resource);
          }}
          className="flex min-w-0 flex-grow flex-col gap-px text-left"
        >
          <span className="truncate text-body text-accent">{resource.name}</span>
          <span className={`text-caption ${status.tone}`}>{status.text}</span>
        </button>
      ) : (
        <span className="flex min-w-0 flex-grow flex-col gap-px">
          <span className="truncate text-body text-ink-primary">{resource.name}</span>
          <span className={`text-caption ${status.tone}`}>{status.text}</span>
        </span>
      )}

      {onRemove ? (
        <button
          type="button"
          aria-label={uk.resources.remove}
          title={uk.resources.remove}
          onClick={() => {
            onRemove(resource.id);
          }}
          className="shrink-0 rounded-sm p-1 text-ink-tertiary transition hover:bg-separator hover:text-danger"
        >
          <TrashIcon size={14} />
        </button>
      ) : null}
    </li>
  );
}
