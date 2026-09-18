import { uk } from '~/shared/i18n/uk';
import type { Language } from '~/shared/ipc';
import { ChevronDownIcon } from '~/shared/ui';

export interface LanguageSelectProps {
  language: Language;
  disabled: boolean;
  onChange: (language: Language) => void;
}

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];

export function LanguageSelect({ language, disabled, onChange }: LanguageSelectProps) {
  return (
    <div className="relative flex h-8 items-center rounded-sm border border-separator bg-surface-elevated px-3">
      <select
        aria-label={uk.meeting.language}
        value={language}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value as Language);
        }}
        className="w-full appearance-none bg-transparent text-body text-ink-primary outline-none disabled:opacity-40"
      >
        {LANGUAGES.map((option) => (
          <option key={option} value={option}>
            {uk.language[option]}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 text-ink-tertiary" />
    </div>
  );
}
