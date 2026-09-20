import { useMemo, useReducer, useState } from 'react';
import { RecentMeetingsList } from '~/features/history/RecentMeetingsList';
import { useMeetings } from '~/features/history/useMeetings';
import { ProjectsBar } from '~/features/projects/ProjectsBar';
import { useProjects } from '~/features/projects/useProjects';
import { ResourcesPanel } from '~/features/resources/ResourcesPanel';
import { projectResources, STAGED_MEETING_RESOURCES } from '~/features/resources/scopes';
import { useResources } from '~/features/resources/useResources';
import { SessionSidebar } from '~/features/session/SessionSidebar';
import { useMeetingSetup } from '~/features/session/useMeetingSetup';
import { useSession } from '~/features/session/useSession';
import { uk } from '~/shared/i18n/uk';
import type { Hotkeys, MeetingScope, Project, UserSettings } from '~/shared/ipc';

export interface MainWindowProps {
  defaults: UserSettings | null;
  onRemember: (settings: UserSettings) => void;
  hotkeys: Hotkeys;
  onOpenMeeting: (id: string) => void;
}

function listTitle(scope: MeetingScope, projects: Project[]): string {
  if (scope.kind === 'outside') {
    return uk.history.outsideProjects;
  }

  if (scope.kind === 'project') {
    const project = projects.find((candidate) => candidate.id === scope.id);

    return project ? `${uk.history.inProject}: ${project.name}` : uk.history.inProject;
  }

  return uk.history.recent;
}

export function MainWindow({
  defaults,
  onRemember,
  hotkeys,
  onOpenMeeting,
}: MainWindowProps) {
  const session = useSession();
  const setup = useMeetingSetup(defaults, onRemember);
  const [revision, changed] = useReducer((count: number) => count + 1, 0);
  const [scope, setScope] = useState<MeetingScope>({ kind: 'all' });
  const projects = useProjects(revision, changed);
  const meetings = useMeetings(scope, revision, changed);
  const materials = useResources(STAGED_MEETING_RESOURCES, revision);
  const openProject = scope.kind === 'project' ? scope.id : null;

  return (
    <div className="flex min-h-0 flex-grow">
      <SessionSidebar
        profile={setup.profile}
        language={setup.language}
        replyLanguage={setup.replyLanguage}
        projectId={setup.projectId}
        projects={projects.projects}
        materials={materials}
        state={session.state}
        busy={session.busy}
        hotkeys={hotkeys}
        notice={session.notice}
        error={session.error}
        onProfileChange={setup.setProfile}
        onLanguageChange={(language) => {
          setup.setLanguage(language);

          if (session.state !== 'idle') {
            session.switchLanguage(language, setup.replyLanguage);
          }
        }}
        onReplyLanguageChange={(replyLanguage) => {
          setup.setReplyLanguage(replyLanguage);

          if (session.state !== 'idle') {
            session.switchLanguage(setup.language, replyLanguage);
          }
        }}
        onProjectChange={setup.setProjectId}
        onStart={() => {
          session.start(
            {
              profile: setup.profile,
              language: setup.language,
              replyLanguage: setup.replyLanguage,
              projectId: setup.projectId,
              resourceIds: materials.resources
                .filter((resource) => resource.status === 'ready')
                .map((resource) => resource.id),
            },
            changed,
          );
        }}
        onStop={session.stop}
      />

      <div className="flex min-h-0 min-w-0 flex-grow flex-col">
        <ProjectsBar
          projects={projects.projects}
          error={projects.error}
          scope={scope}
          onScope={setScope}
          onCreate={projects.create}
          onRename={projects.rename}
          onRemove={projects.remove}
          onMoveMeeting={meetings.move}
        />

        {openProject ? <ProjectMaterials projectId={openProject} /> : null}

        <RecentMeetingsList
          title={listTitle(scope, projects.projects)}
          meetings={meetings.meetings}
          loading={meetings.loading}
          loadingMore={meetings.loadingMore}
          error={meetings.error}
          onOpen={onOpenMeeting}
          onReachEnd={meetings.loadMore}
          onRename={meetings.rename}
          onRemove={meetings.remove}
        />
      </div>
    </div>
  );
}

interface ProjectMaterialsProps {
  projectId: string;
}

function ProjectMaterials({ projectId }: ProjectMaterialsProps) {
  const scope = useMemo(() => projectResources(projectId), [projectId]);
  const resources = useResources(scope);

  return (
    <div className="shrink-0 border-b border-separator px-5 py-4">
      <ResourcesPanel
        title={uk.resources.projectTitle}
        hint={uk.resources.projectHint}
        resources={resources}
      />
    </div>
  );
}
