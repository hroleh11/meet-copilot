import { uk } from '~/shared/i18n/uk';
import type { Language, MeetingProfile, SessionState } from '~/shared/ipc';
import { SectionLabel } from '~/shared/ui';
import { AudioSourceStatus } from './AudioSourceStatus';
import { LanguageSelect } from './LanguageSelect';
import { ProfileSwitcher } from './ProfileSwitcher';
import { StartMeetingButton } from './StartMeetingButton';
import { useAudioSources } from './useAudioSources';

export interface SessionSidebarProps {
  profile: MeetingProfile;
  language: Language;
  state: SessionState;
  busy: boolean;
  hotkey: string;
  notice: string | null;
  error: string | null;
  onProfileChange: (profile: MeetingProfile) => void;
  onLanguageChange: (language: Language) => void;
  onStart: () => void;
  onStop: () => void;
}

export function SessionSidebar({
  profile,
  language,
  state,
  busy,
  hotkey,
  notice,
  error,
  onProfileChange,
  onLanguageChange,
  onStart,
  onStop,
}: SessionSidebarProps) {
  const sources = useAudioSources();
  const locked = state !== 'idle';

  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-5 border-r border-separator bg-surface-secondary p-5">
      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.profile}</SectionLabel>
        <ProfileSwitcher profile={profile} disabled={locked} onChange={onProfileChange} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.language}</SectionLabel>
        <LanguageSelect
          language={language}
          disabled={locked}
          onChange={onLanguageChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.sources}</SectionLabel>
        <AudioSourceStatus
          microphone={sources.microphone}
          systemAudio={sources.systemAudio}
        />
      </div>

      <div className="flex-grow" />

      {notice ? <p className="text-caption text-danger">{uk.meeting.problem}</p> : null}
      {error ? <p className="text-caption text-danger">{error}</p> : null}

      <StartMeetingButton
        state={state}
        busy={busy}
        hotkey={hotkey}
        onStart={onStart}
        onStop={onStop}
      />
    </aside>
  );
}
