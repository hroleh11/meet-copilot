import { uk } from '~/shared/i18n/uk';
import type { Language, MeetingProfile, SessionState, UserSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import type { SourceStatus } from '~/shared/store/sessionStore';
import { Button, Field, Panel } from '~/shared/ui';
import { StatusList } from './StatusList';
import type { ConnectionState } from './useConnection';

export interface SessionPanelProps {
  state: SessionState;
  busy: boolean;
  notice: string | null;
  error: string | null;
  defaults: UserSettings | null;
  sources: SourceStatus[];
  connection: ConnectionState;
  onStart: (profile: MeetingProfile, language: Language) => void;
  onStop: () => void;
  onRetryConnection: () => void;
}

const LANGUAGES: Language[] = ['uk', 'en', 'ru'];
const PROFILES: MeetingProfile[] = ['daily', 'interview_candidate', 'client_call'];

const selectClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500 disabled:opacity-50';

export function SessionPanel({
  state,
  busy,
  notice,
  error,
  defaults,
  sources,
  connection,
  onStart,
  onStop,
  onRetryConnection,
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
      <StatusList
        state={state}
        sources={sources}
        connection={connection}
        onRetryConnection={onRetryConnection}
      />

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

      {notice ? <p className="text-sm text-amber-400">{uk.meeting.problem}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </Panel>
  );
}
