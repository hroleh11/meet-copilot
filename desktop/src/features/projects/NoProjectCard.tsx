import { uk } from '~/shared/i18n/uk';
import { useMeetingDrop } from '~/shared/lib/meetingDrag';
import { FolderIcon } from '~/shared/ui';
import { ProjectTile } from './ProjectTile';

export interface NoProjectCardProps {
  active: boolean;
  onSelect: () => void;
  onDropMeeting: (meetingId: string) => void;
}

/// Dropping a meeting here is how it leaves the project it was in, so the tile
/// is both a filter and the way back out.
export function NoProjectCard({ active, onSelect, onDropMeeting }: NoProjectCardProps) {
  const drop = useMeetingDrop(onDropMeeting);

  return (
    <ProjectTile active={active} over={drop.over} handlers={drop.handlers}>
      <FolderIcon className="shrink-0 text-ink-tertiary" />
      <button
        type="button"
        onClick={onSelect}
        className="w-0 flex-grow truncate text-left text-body-emphasized text-ink-primary"
      >
        {uk.projects.outside}
      </button>
    </ProjectTile>
  );
}
