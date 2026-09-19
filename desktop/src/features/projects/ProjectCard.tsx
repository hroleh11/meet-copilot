import { uk } from '~/shared/i18n/uk';
import type { Project } from '~/shared/ipc';
import { useMeetingDrop } from '~/shared/lib/meetingDrag';
import { useRename } from '~/shared/lib/useRename';
import { FolderIcon, PencilIcon, TextInput, TrashIcon } from '~/shared/ui';
import { ProjectTile } from './ProjectTile';

export interface ProjectCardProps {
  project: Project;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onDropMeeting: (meetingId: string) => void;
}

export function ProjectCard({
  project,
  active,
  onSelect,
  onRename,
  onRemove,
  onDropMeeting,
}: ProjectCardProps) {
  const drop = useMeetingDrop(onDropMeeting);
  const rename = useRename(project.name, onRename);

  return (
    <ProjectTile active={active} over={drop.over} handlers={drop.handlers}>
      <FolderIcon className="shrink-0 text-ink-tertiary" />

      {rename.editing ? (
        <TextInput
          autoFocus
          value={rename.draft}
          aria-label={uk.projects.rename}
          tone="recessed"
          onChange={(event) => {
            rename.change(event.target.value);
          }}
          onKeyDown={rename.onKeyDown}
          onBlur={rename.commit}
          className="w-0 flex-grow"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="flex w-0 flex-grow flex-col gap-px text-left"
        >
          <span className="truncate text-body-emphasized text-ink-primary">
            {project.name}
          </span>
          <span className="text-caption text-ink-tertiary">
            {project.meetingCount} {uk.projects.meetings}
          </span>
        </button>
      )}

      {rename.editing ? null : (
        <span className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            aria-label={uk.projects.rename}
            onClick={rename.start}
            className="rounded-sm p-1 text-ink-tertiary hover:text-ink-primary"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            aria-label={uk.projects.delete}
            onClick={onRemove}
            className="rounded-sm p-1 text-ink-tertiary hover:text-danger"
          >
            <TrashIcon />
          </button>
        </span>
      )}
    </ProjectTile>
  );
}
