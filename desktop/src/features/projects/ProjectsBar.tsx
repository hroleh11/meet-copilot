import { useState } from 'react';
import { uk } from '~/shared/i18n/uk';
import type { MeetingScope, Project } from '~/shared/ipc';
import { ConfirmDialog } from '~/shared/ui';
import { NewProjectCard } from './NewProjectCard';
import { NoProjectCard } from './NoProjectCard';
import { ProjectCard } from './ProjectCard';

export interface ProjectsBarProps {
  projects: Project[];
  error: string | null;
  scope: MeetingScope;
  onScope: (scope: MeetingScope) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMoveMeeting: (meetingId: string, project: string | null) => void;
}

function sameScope(one: MeetingScope, other: MeetingScope): boolean {
  if (one.kind === 'project' && other.kind === 'project') {
    return one.id === other.id;
  }

  return one.kind === other.kind;
}

function describe(project: Project): string {
  const template =
    project.meetingCount > 0 ? uk.projects.deleteHint : uk.projects.deleteEmptyHint;

  return template
    .replace('{name}', project.name)
    .replace('{count}', String(project.meetingCount));
}

export function ProjectsBar({
  projects,
  error,
  scope,
  onScope,
  onCreate,
  onRename,
  onRemove,
  onMoveMeeting,
}: ProjectsBarProps) {
  const [removing, setRemoving] = useState<Project | null>(null);

  const select = (next: MeetingScope) => {
    onScope(sameScope(scope, next) ? { kind: 'all' } : next);
  };

  return (
    <section className="shrink-0 border-b border-separator px-5 py-4">
      <header className="flex items-baseline justify-between gap-4 pb-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="shrink-0 text-headline text-ink-primary">{uk.projects.title}</h2>
          <p className="truncate text-caption text-ink-tertiary">
            {uk.projects.dropHint}
          </p>
        </div>
        {scope.kind === 'all' ? null : (
          <button
            type="button"
            onClick={() => {
              onScope({ kind: 'all' });
            }}
            className="shrink-0 text-caption text-accent"
          >
            {uk.projects.showAll}
          </button>
        )}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <NoProjectCard
          active={scope.kind === 'outside'}
          onSelect={() => {
            select({ kind: 'outside' });
          }}
          onDropMeeting={(meetingId) => {
            onMoveMeeting(meetingId, null);
          }}
        />

        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            active={scope.kind === 'project' && scope.id === project.id}
            onSelect={() => {
              select({ kind: 'project', id: project.id });
            }}
            onRename={(name) => {
              onRename(project.id, name);
            }}
            onRemove={() => {
              setRemoving(project);
            }}
            onDropMeeting={(meetingId) => {
              onMoveMeeting(meetingId, project.id);
            }}
          />
        ))}

        <NewProjectCard onCreate={onCreate} />
      </div>

      {error ? <p className="pt-2 text-body text-danger">{error}</p> : null}

      {removing ? (
        <ConfirmDialog
          title={uk.projects.deleteTitle}
          description={describe(removing)}
          confirmLabel={uk.history.confirm}
          cancelLabel={uk.history.cancel}
          onConfirm={() => {
            onRemove(removing.id);
            setRemoving(null);
          }}
          onCancel={() => {
            setRemoving(null);
          }}
        />
      ) : null}
    </section>
  );
}
