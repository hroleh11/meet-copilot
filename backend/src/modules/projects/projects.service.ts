import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from '~/generated/prisma/client';
import type { CreateProjectDto, RenameProjectDto } from './dto/projects.dto';
import type { ProjectResponse } from './dto/projects.responses';
import { toProjectResponse } from './projects.mapper';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async list(userId: string): Promise<ProjectResponse[]> {
    const projects = await this.projectsRepository.listOwned(userId);

    return projects.map(toProjectResponse);
  }

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponse> {
    const project = await this.projectsRepository.create(userId, dto.name.trim());

    return toProjectResponse(project);
  }

  async rename(
    userId: string,
    projectId: string,
    dto: RenameProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.requireOwned(userId, projectId);
    const renamed = await this.projectsRepository.rename(project.id, dto.name.trim());

    return toProjectResponse(renamed);
  }

  async remove(userId: string, projectId: string): Promise<void> {
    const project = await this.requireOwned(userId, projectId);

    if (await this.projectsRepository.holdsLiveMeeting(project.id)) {
      throw new ConflictException('Finish the meeting that is still running first');
    }

    await this.projectsRepository.delete(project.id);
  }

  async requireOwned(userId: string, projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOwned(userId, projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
