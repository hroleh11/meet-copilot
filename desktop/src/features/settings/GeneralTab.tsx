import { uk } from '~/shared/i18n/uk';
import type { Language, MeetingProfile, UserSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, SegmentedControl, Select } from '~/shared/ui';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export interface GeneralTabProps {
  settings: UserSettings;
  email: string | null;
  onSave: (settings: UserSettings) => void;
  onSignOut: () => void;
}

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];
const PROFILES: MeetingProfile[] = ['daily', 'interview_candidate', 'client_call'];

const LANGUAGE_OPTIONS = LANGUAGES.map((language) => ({
  value: language,
  label: uk.language[language],
}));

const PROFILE_OPTIONS = PROFILES.map((profile) => ({
  value: profile,
  label: uk.profile[profile],
}));

export function GeneralTab({ settings, email, onSave, onSignOut }: GeneralTabProps) {
  const [draft, setDraft] = useResettableDraft(settings);

  return (
    <>
      <div className="flex flex-col gap-3">
        <SettingsGroup title={uk.settings.groupProfile}>
          <SettingsRow label={uk.settings.defaultProfile}>
            <SegmentedControl
              label={uk.settings.defaultProfile}
              options={PROFILE_OPTIONS}
              value={draft.defaultProfile}
              onChange={(defaultProfile) => {
                setDraft({ ...draft, defaultProfile });
              }}
            />
          </SettingsRow>

          <SettingsRow label={uk.settings.defaultLanguage}>
            <Select
              label={uk.settings.defaultLanguage}
              options={LANGUAGE_OPTIONS}
              value={draft.defaultLanguage}
              tone="recessed"
              className="w-[160px]"
              onChange={(defaultLanguage) => {
                setDraft({ ...draft, defaultLanguage });
              }}
            />
          </SettingsRow>

          <SettingsRow label={uk.settings.style} hint={uk.settings.styleHint} stacked>
            <textarea
              rows={3}
              value={draft.style ?? ''}
              placeholder={uk.settings.stylePlaceholder}
              aria-label={uk.settings.style}
              onChange={(event) => {
                setDraft({ ...draft, style: event.target.value || null });
              }}
              className="resize-none rounded-md border border-separator bg-surface-primary px-3 py-2 text-body text-ink-primary outline-none placeholder:text-ink-tertiary focus:border-accent"
            />
          </SettingsRow>
        </SettingsGroup>

        <div>
          <Button
            className="h-8"
            onClick={() => {
              onSave(draft);
            }}
          >
            {uk.settings.save}
          </Button>
        </div>
      </div>

      <SettingsGroup title={uk.settings.groupAccount}>
        <SettingsRow label={uk.auth.signedInAs} hint={email ?? undefined}>
          <Button variant="secondary" className="h-8" onClick={onSignOut}>
            {uk.auth.signOut}
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
