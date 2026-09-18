import type { Language, MeetingProfile, UserSettings } from '~/shared/ipc';
import { uk } from '~/shared/i18n/uk';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, Field, Panel } from '~/shared/ui';

export interface UserSettingsPanelProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];
const PROFILES: MeetingProfile[] = ['daily', 'interview_candidate', 'client_call'];

const selectClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500';

export function UserSettingsPanel({ settings, onSave }: UserSettingsPanelProps) {
  const [draft, setDraft] = useResettableDraft(settings);

  return (
    <Panel title={uk.settings.account}>
      <Field label={uk.settings.style} hint={uk.settings.styleHint}>
        <textarea
          rows={3}
          value={draft.style ?? ''}
          placeholder={uk.settings.stylePlaceholder}
          onChange={(event) => {
            setDraft({ ...draft, style: event.target.value || null });
          }}
          className={`${selectClass} resize-none`}
        />
      </Field>

      <Field label={uk.settings.defaultLanguage}>
        <select
          value={draft.defaultLanguage}
          onChange={(event) => {
            setDraft({ ...draft, defaultLanguage: event.target.value as Language });
          }}
          className={selectClass}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {uk.language[language]}
            </option>
          ))}
        </select>
      </Field>

      <Field label={uk.settings.defaultProfile}>
        <select
          value={draft.defaultProfile}
          onChange={(event) => {
            setDraft({ ...draft, defaultProfile: event.target.value as MeetingProfile });
          }}
          className={selectClass}
        >
          {PROFILES.map((profile) => (
            <option key={profile} value={profile}>
              {uk.profile[profile]}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <Button
          onClick={() => {
            onSave(draft);
          }}
        >
          {uk.settings.save}
        </Button>
      </div>
    </Panel>
  );
}
