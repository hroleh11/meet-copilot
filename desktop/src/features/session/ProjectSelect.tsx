import { uk } from '~/shared/i18n/uk';
import type { Project } from '~/shared/ipc';
import { Select } from '~/shared/ui';

export interface ProjectSelectProps {
  projects: Project[];
  projectId: string | null;
  disabled: boolean;
  onChange: (projectId: string | null) => void;
}

const OUTSIDE = 'none';

export function ProjectSelect({
  projects,
  projectId,
  disabled,
  onChange,
}: ProjectSelectProps) {
  return (
    <Select
      label={uk.meeting.project}
      value={projectId ?? OUTSIDE}
      disabled={disabled}
      options={[
        { value: OUTSIDE, label: uk.meeting.noProject },
        ...projects.map((project) => ({ value: project.id, label: project.name })),
      ]}
      onChange={(value) => {
        onChange(value === OUTSIDE ? null : value);
      }}
    />
  );
}
