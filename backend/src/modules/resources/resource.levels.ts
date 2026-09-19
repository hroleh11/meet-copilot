import { BadRequestException, Injectable } from '@nestjs/common';
import { ResourceScope } from '~/generated/prisma/enums';
import { ProjectsService } from '~/modules/projects';
import type { ResourceFilter } from './resources.repository';

export interface Level {
  scope: ResourceScope;
  projectId?: string;
  meetingId?: string;
}

/// What a level means is the same question on the way in and on the way out, so
/// both the upload and the listing ask it here: a project material needs a project
/// the user owns, and the other two levels have none.
@Injectable()
export class ResourceLevels {
  constructor(private readonly projectsService: ProjectsService) {}

  async require(userId: string, level: Level): Promise<void> {
    if (level.scope === ResourceScope.project) {
      if (!level.projectId) {
        throw new BadRequestException('A project material needs a project');
      }

      await this.projectsService.requireOwned(userId, level.projectId);
      return;
    }

    if (level.projectId) {
      throw new BadRequestException('Only a project material belongs to a project');
    }
  }

  async filter(userId: string, level: Level): Promise<ResourceFilter> {
    await this.require(userId, level);

    if (level.scope === ResourceScope.project) {
      return { scope: level.scope, projectId: level.projectId };
    }

    if (level.scope === ResourceScope.meeting) {
      return { scope: level.scope, meetingId: level.meetingId ?? null };
    }

    return { scope: level.scope };
  }
}
