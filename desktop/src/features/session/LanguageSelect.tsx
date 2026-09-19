import { uk } from '~/shared/i18n/uk';
import type { Language } from '~/shared/ipc';
import { Select } from '~/shared/ui';

export interface LanguageSelectProps {
  language: Language;
  disabled: boolean;
  onChange: (language: Language) => void;
}

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];

const OPTIONS = LANGUAGES.map((language) => ({
  value: language,
  label: uk.language[language],
}));

export function LanguageSelect({ language, disabled, onChange }: LanguageSelectProps) {
  return (
    <Select
      label={uk.meeting.language}
      options={OPTIONS}
      value={language}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
