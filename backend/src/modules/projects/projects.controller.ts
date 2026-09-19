import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '~/common/decorators';
import { MessageResponse } from '~/common/dto';
import { CreateProjectDto, RenameProjectDto } from './dto/projects.dto';
import { ProjectResponse } from './dto/projects.responses';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Projects of the current user, most recently touched first' })
  @ApiOkResponse({ type: [ProjectResponse] })
  list(@GetCurrentUserId() userId: string): Promise<ProjectResponse[]> {
    return this.projectsService.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project to group meetings in' })
  @ApiCreatedResponse({ type: ProjectResponse })
  create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponse> {
    return this.projectsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a project' })
  @ApiOkResponse({ type: ProjectResponse })
  rename(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: RenameProjectDto,
  ): Promise<ProjectResponse> {
    return this.projectsService.rename(userId, projectId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a project together with every meeting in it',
    description: 'Refused while one of those meetings is still running.',
  })
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) projectId: string,
  ): Promise<MessageResponse> {
    await this.projectsService.remove(userId, projectId);

    return { message: 'Done' };
  }
}
