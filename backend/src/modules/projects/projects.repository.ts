import { Injectable } from '@nestjs/common';
import type { Project } from '~/generated/prisma/client';
import { PrismaService } from '~/infrastructure/prisma';

export type ProjectWithCount = Project & { _count: { meetings: number } };

const withCount = { _count: { select: { meetings: true } } };

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listOwned(userId: string): Promise<ProjectWithCount[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: withCount,
    });
  }

  create(userId: string, name: string): Promise<ProjectWithCount> {
    return this.prisma.project.create({
      data: { userId, name },
      include: withCount,
    });
  }

  findOwned(userId: string, projectId: string): Promise<Project | null> {
    return this.prisma.project.findFirst({ where: { id: projectId, userId } });
  }

  rename(projectId: string, name: string): Promise<ProjectWithCount> {
    return this.prisma.project.update({
      where: { id: projectId },
      data: { name },
      include: withCount,
    });
  }

  async holdsLiveMeeting(projectId: string): Promise<boolean> {
    const live = await this.prisma.meeting.count({
      where: { projectId, status: 'live' },
    });

    return live > 0;
  }

  async delete(projectId: string): Promise<void> {
    await this.prisma.project.delete({ where: { id: projectId } });
  }
}
