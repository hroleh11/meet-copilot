import { uk } from '~/shared/i18n/uk';
import { useRename } from '~/shared/lib/useRename';
import { PlusIcon, TextInput } from '~/shared/ui';

export interface NewProjectCardProps {
  onCreate: (name: string) => void;
}

export function NewProjectCard({ onCreate }: NewProjectCardProps) {
  const naming = useRename('', onCreate);

  if (naming.editing) {
    return (
      <TextInput
        autoFocus
        value={naming.draft}
        aria-label={uk.projects.namePlaceholder}
        placeholder={uk.projects.namePlaceholder}
        onChange={(event) => {
          naming.change(event.target.value);
        }}
        onKeyDown={naming.onKeyDown}
        onBlur={naming.commit}
        className="h-14 w-[220px] shrink-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={naming.start}
      className="flex h-14 w-[220px] shrink-0 items-center justify-center gap-2 rounded-md border border-dashed border-separator text-body-emphasized text-ink-secondary transition hover:border-accent hover:text-accent"
    >
      <PlusIcon />
      {uk.projects.newProject}
    </button>
  );
}
