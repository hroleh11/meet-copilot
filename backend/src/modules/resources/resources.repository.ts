import { Injectable } from '@nestjs/common';
import type { Resource } from '~/generated/prisma/client';
import type {
  ResourceKind,
  ResourceScope,
  ResourceStatus,
} from '~/generated/prisma/enums';
import { PrismaService } from '~/infrastructure/prisma';

export interface NewResource {
  id: string;
  userId: string;
  scope: ResourceScope;
  projectId: string | null;
  kind: ResourceKind;
  name: string;
  mimeType: string;
  byteSize: number;
  storageKey: string | null;
  status: ResourceStatus;
  text: string | null;
  chars: number;
}

export interface ResourceFilter {
  scope: ResourceScope;
  projectId?: string | null;
  meetingId?: string | null;
}

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: NewResource): Promise<Resource> {
    return this.prisma.resource.create({ data });
  }

  findOwned(userId: string, resourceId: string): Promise<Resource | null> {
    return this.prisma.resource.findFirst({ where: { id: resourceId, userId } });
  }

  listOwned(userId: string, filter: ResourceFilter): Promise<Resource[]> {
    return this.prisma.resource.findMany({
      where: {
        userId,
        scope: filter.scope,
        ...(filter.projectId === undefined ? {} : { projectId: filter.projectId }),
        ...(filter.meetingId === undefined ? {} : { meetingId: filter.meetingId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listReady(userId: string, filter: ResourceFilter): Promise<Resource[]> {
    return this.prisma.resource.findMany({
      where: {
        userId,
        scope: filter.scope,
        status: 'ready',
        ...(filter.projectId === undefined ? {} : { projectId: filter.projectId }),
        ...(filter.meetingId === undefined ? {} : { meetingId: filter.meetingId }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  update(
    resourceId: string,
    data: Partial<Pick<Resource, 'status' | 'failure' | 'text' | 'digest' | 'chars'>>,
  ): Promise<Resource> {
    return this.prisma.resource.update({ where: { id: resourceId }, data });
  }

  claim(userId: string, meetingId: string, resourceIds: string[]): Promise<number> {
    return this.prisma.resource
      .updateMany({
        where: { id: { in: resourceIds }, userId, scope: 'meeting', meetingId: null },
        data: { meetingId },
      })
      .then((result) => result.count);
  }

  listStagedBefore(createdBefore: Date): Promise<Resource[]> {
    return this.prisma.resource.findMany({
      where: { scope: 'meeting', meetingId: null, createdAt: { lt: createdBefore } },
    });
  }

  async delete(resourceId: string): Promise<void> {
    await this.prisma.resource.delete({ where: { id: resourceId } });
  }
}
