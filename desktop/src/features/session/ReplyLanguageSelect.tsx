import { uk } from '~/shared/i18n/uk';
import type { Language } from '~/shared/ipc';
import { Select } from '~/shared/ui';

export interface ReplyLanguageSelectProps {
  replyLanguage: Language | null;
  onChange: (replyLanguage: Language | null) => void;
}

const AUTO = 'auto';

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];

const OPTIONS = [
  { value: AUTO, label: uk.meeting.replyAuto },
  ...LANGUAGES.map((language) => ({ value: language, label: uk.language[language] })),
];

/// The reply follows the room by default, because an interview can open in one
/// language and carry on in another and a draft nobody can say is worthless.
export function ReplyLanguageSelect({
  replyLanguage,
  onChange,
}: ReplyLanguageSelectProps) {
  return (
    <Select
      label={uk.meeting.replyLanguage}
      options={OPTIONS}
      value={replyLanguage ?? AUTO}
      onChange={(value) => {
        onChange(value === AUTO ? null : (value as Language));
      }}
    />
  );
}
