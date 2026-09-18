import { uk } from '~/shared/i18n/uk';
import type { Language, MeetingProfile, SessionState, UserSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, Field, Panel } from '~/shared/ui';

export interface SessionPanelProps {
  state: SessionState;
  busy: boolean;
  notice: string | null;
  error: string | null;
  defaults: UserSettings | null;
  onStart: (profile: MeetingProfile, language: Language) => void;
  onStop: () => void;
}

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];
const PROFILES: MeetingProfile[] = ['daily', 'interview_candidate', 'client_call'];

const selectClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500 disabled:opacity-50';

const STATUS: Record<SessionState, string> = {
  idle: uk.meeting.idle,
  starting: uk.meeting.starting,
  listening: uk.meeting.listening,
  stopping: uk.meeting.stopping,
};

export function SessionPanel({
  state,
  busy,
  notice,
  error,
  defaults,
  onStart,
  onStop,
}: SessionPanelProps) {
  const [profile, setProfile] = useResettableDraft<MeetingProfile>(
    defaults?.defaultProfile ?? 'daily',
  );
  const [language, setLanguage] = useResettableDraft<Language>(
    defaults?.defaultLanguage ?? 'uk',
  );

  const listening = state === 'listening';

  return (
    <Panel title={uk.meeting.title}>
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${listening ? 'bg-emerald-500' : 'bg-neutral-600'}`}
        />
        <span className="text-neutral-300">{STATUS[state]}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={uk.meeting.profile}>
          <select
            value={profile}
            disabled={listening || busy}
            onChange={(event) => {
              setProfile(event.target.value as MeetingProfile);
            }}
            className={selectClass}
          >
            {PROFILES.map((option) => (
              <option key={option} value={option}>
                {uk.profile[option]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={uk.meeting.language}>
          <select
            value={language}
            disabled={listening || busy}
            onChange={(event) => {
              setLanguage(event.target.value as Language);
            }}
            className={selectClass}
          >
            {LANGUAGES.map((option) => (
              <option key={option} value={option}>
                {uk.language[option]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <Button
          disabled={busy}
          onClick={() => {
            if (listening) {
              onStop();
            } else {
              onStart(profile, language);
            }
          }}
        >
          {listening ? uk.meeting.stop : uk.meeting.start}
        </Button>
      </div>

      {notice ? <p className="text-sm text-amber-400">{notice}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </Panel>
  );
}
