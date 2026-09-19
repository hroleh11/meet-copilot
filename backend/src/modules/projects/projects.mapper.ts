import type { ProjectWithCount } from './projects.repository';
import type { ProjectResponse } from './dto/projects.responses';

export function toProjectResponse(project: ProjectWithCount): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    meetingCount: project._count.meetings,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
