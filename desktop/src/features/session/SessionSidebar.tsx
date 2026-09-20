import { ResourcesPanel } from '~/features/resources/ResourcesPanel';
import type { UseResourcesResult } from '~/features/resources/useResources';
import { uk } from '~/shared/i18n/uk';
import type {
  Hotkeys,
  Language,
  MeetingProfile,
  Project,
  SessionState,
} from '~/shared/ipc';
import { SectionLabel } from '~/shared/ui';
import { AudioSourceStatus } from './AudioSourceStatus';
import { HotkeyHints } from './HotkeyHints';
import { LanguageSelect } from './LanguageSelect';
import { ProfileSwitcher } from './ProfileSwitcher';
import { ProjectSelect } from './ProjectSelect';
import { ReplyLanguageSelect } from './ReplyLanguageSelect';
import { StartMeetingButton } from './StartMeetingButton';
import { useAudioSources } from './useAudioSources';

export interface SessionSidebarProps {
  profile: MeetingProfile;
  language: Language;
  replyLanguage: Language | null;
  projectId: string | null;
  projects: Project[];
  materials: UseResourcesResult;
  state: SessionState;
  busy: boolean;
  hotkeys: Hotkeys;
  notice: string | null;
  error: string | null;
  onProfileChange: (profile: MeetingProfile) => void;
  onLanguageChange: (language: Language) => void;
  onReplyLanguageChange: (replyLanguage: Language | null) => void;
  onProjectChange: (projectId: string | null) => void;
  onStart: () => void;
  onStop: () => void;
}

export function SessionSidebar({
  profile,
  language,
  replyLanguage,
  projectId,
  projects,
  materials,
  state,
  busy,
  hotkeys,
  notice,
  error,
  onProfileChange,
  onLanguageChange,
  onReplyLanguageChange,
  onProjectChange,
  onStart,
  onStop,
}: SessionSidebarProps) {
  const sources = useAudioSources();
  const locked = state !== 'idle';

  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-separator bg-surface-secondary p-5">
      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.profile}</SectionLabel>
        <ProfileSwitcher profile={profile} disabled={locked} onChange={onProfileChange} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.language}</SectionLabel>
        <LanguageSelect
          language={language}
          disabled={false}
          onChange={onLanguageChange}
        />
        <p className="text-caption text-ink-tertiary">{uk.meeting.languageHint}</p>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.replyLanguage}</SectionLabel>
        <ReplyLanguageSelect
          replyLanguage={replyLanguage}
          onChange={onReplyLanguageChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.project}</SectionLabel>
        <ProjectSelect
          projects={projects}
          projectId={projectId}
          disabled={locked}
          onChange={onProjectChange}
        />
      </div>

      {locked ? null : (
        <ResourcesPanel
          title={uk.resources.meetingTitle}
          hint={uk.resources.meetingHint}
          resources={materials}
        />
      )}

      <div className="flex flex-col gap-2">
        <SectionLabel>{uk.meeting.sources}</SectionLabel>
        <AudioSourceStatus
          microphone={sources.microphone}
          systemAudio={sources.systemAudio}
          onOpenPermission={sources.openPermission}
        />
      </div>

      <div className="flex-grow" />

      {notice ? <p className="text-caption text-danger">{uk.meeting.problem}</p> : null}
      {error ? <p className="text-caption text-danger">{error}</p> : null}

      <div className="flex flex-col gap-2">
        {materials.reading ? (
          <p className="text-caption text-ink-tertiary">{uk.resources.preparing}</p>
        ) : null}
        <StartMeetingButton
          state={state}
          busy={busy || (state === 'idle' && materials.reading)}
          onStart={onStart}
          onStop={onStop}
        />
        <HotkeyHints reply={hotkeys.reply} screenshot={hotkeys.screenshot} />
      </div>
    </aside>
  );
}
