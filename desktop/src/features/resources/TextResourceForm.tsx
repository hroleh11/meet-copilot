import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import { Button, TextInput } from '~/shared/ui';

export interface TextResourceFormProps {
  maxChars: number | null;
  onSave: (name: string, text: string) => void;
  onCancel: () => void;
}

export function TextResourceForm({ maxChars, onSave, onCancel }: TextResourceFormProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const ready = name.trim().length > 0 && text.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-2 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();

        if (ready) {
          onSave(name.trim(), text.trim());
        }
      }}
    >
      <TextInput
        aria-label={uk.resources.namePlaceholder}
        value={name}
        placeholder={uk.resources.namePlaceholder}
        tone="recessed"
        onChange={(event) => {
          setName(event.target.value);
        }}
      />

      <textarea
        aria-label={uk.resources.textPlaceholder}
        value={text}
        placeholder={uk.resources.textPlaceholder}
        rows={5}
        maxLength={maxChars ?? undefined}
        onChange={(event) => {
          setText(event.target.value);
        }}
        className="rounded-sm border border-separator bg-surface-primary px-3 py-2 text-body text-ink-primary outline-none"
      />

      <div className="flex items-center justify-end gap-2">
        {maxChars ? (
          <span className="mr-auto text-caption text-ink-tertiary">
            {uk.resources.textLimit.replace('{count}', String(maxChars))}
          </span>
        ) : null}
        <Button type="button" variant="ghost" className="h-8" onClick={onCancel}>
          {uk.resources.cancel}
        </Button>
        <Button type="submit" className="h-8" disabled={!ready}>
          {uk.resources.save}
        </Button>
      </div>
    </form>
  );
}
