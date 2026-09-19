import { randomUUID } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { Resource } from '~/generated/prisma/client';
import { ResourceScope } from '~/generated/prisma/enums';
import { ObjectStorage } from '~/infrastructure/storage';
import { ContextBriefBuilder } from './context-brief.builder';
import type {
  AddResourceDto,
  AddResourceTextDto,
  ListResourcesDto,
} from './dto/resources.dto';
import type {
  ResourceContentResponse,
  ResourceLimitsResponse,
  ResourceResponse,
} from './dto/resources.responses';
import { ResourceExtractor } from './resource.extractor';
import { ResourceIngestor } from './resource.ingestor';
import { ResourceLevels } from './resource.levels';
import { toContentResponse, toResourceResponse } from './resources.mapper';
import { ResourcesRepository } from './resources.repository';
import type { BriefSource, ResourceUpload } from './types/resources.types';

const TEXT_MIME = 'text/plain';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly resourcesRepository: ResourcesRepository,
    private readonly ingestor: ResourceIngestor,
    private readonly extractor: ResourceExtractor,
    private readonly briefBuilder: ContextBriefBuilder,
    private readonly levels: ResourceLevels,
    private readonly storage: ObjectStorage,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async list(userId: string, query: ListResourcesDto): Promise<ResourceResponse[]> {
    const filter = await this.levels.filter(userId, query);
    const resources = await this.resourcesRepository.listOwned(userId, filter);

    return resources.map(toResourceResponse);
  }

  async get(userId: string, resourceId: string): Promise<ResourceResponse> {
    return toResourceResponse(await this.requireOwned(userId, resourceId));
  }

  async content(userId: string, resourceId: string): Promise<ResourceContentResponse> {
    return toContentResponse(await this.requireOwned(userId, resourceId));
  }

  limits(): ResourceLimitsResponse {
    return {
      maxBytes: this.configService.getOrThrow<number>('RESOURCE_MAX_BYTES'),
      maxTextChars: this.maxTextChars(),
    };
  }

  async addFile(
    userId: string,
    dto: AddResourceDto,
    upload: ResourceUpload,
  ): Promise<ResourceResponse> {
    await this.levels.require(userId, dto);

    const name = dto.name.trim();
    const kind = this.extractor.kindOf(upload.mimeType, name);

    if (!kind) {
      throw new UnsupportedMediaTypeException('Only PDF, Markdown and plain text');
    }

    if (
      upload.bytes.length > this.configService.getOrThrow<number>('RESOURCE_MAX_BYTES')
    ) {
      throw new PayloadTooLargeException('This file is too large');
    }

    const id = randomUUID();
    const resource = await this.resourcesRepository.create({
      id,
      userId,
      scope: dto.scope,
      projectId: dto.projectId ?? null,
      kind,
      name,
      mimeType: upload.mimeType,
      byteSize: upload.bytes.length,
      storageKey: `users/${userId}/resources/${id}`,
      status: 'pending',
      text: null,
      chars: 0,
    });

    void this.ingestor.ingest(resource, upload.bytes);

    return toResourceResponse(resource);
  }

  async addText(userId: string, dto: AddResourceTextDto): Promise<ResourceResponse> {
    await this.levels.require(userId, dto);

    if (dto.text.length > this.maxTextChars()) {
      throw new PayloadTooLargeException('This text is too long');
    }

    const text = this.extractor.normalize(dto.text);
    const resource = await this.resourcesRepository.create({
      id: randomUUID(),
      userId,
      scope: dto.scope,
      projectId: dto.projectId ?? null,
      kind: 'text',
      name: dto.name.trim(),
      mimeType: TEXT_MIME,
      byteSize: Buffer.byteLength(text),
      storageKey: null,
      status: 'pending',
      text: null,
      chars: 0,
    });

    await this.ingestor.ready(resource, text);

    return this.get(userId, resource.id);
  }

  async remove(userId: string, resourceId: string): Promise<void> {
    const resource = await this.requireOwned(userId, resourceId);

    if (resource.storageKey) {
      await this.storage.delete(resource.storageKey);
    }

    await this.resourcesRepository.delete(resource.id);
  }

  async claimForMeeting(
    userId: string,
    meetingId: string,
    resourceIds: string[],
  ): Promise<void> {
    if (resourceIds.length === 0) {
      return;
    }

    const claimed = await this.resourcesRepository.claim(userId, meetingId, resourceIds);

    if (claimed !== new Set(resourceIds).size) {
      throw new NotFoundException('Some of those materials no longer exist');
    }
  }

  async briefFor(
    userId: string,
    projectId: string | null,
    meetingId: string,
  ): Promise<string | null> {
    const [user, project, meeting] = await Promise.all([
      this.resourcesRepository.listReady(userId, { scope: ResourceScope.user }),
      projectId
        ? this.resourcesRepository.listReady(userId, {
            scope: ResourceScope.project,
            projectId,
          })
        : Promise.resolve([]),
      this.resourcesRepository.listReady(userId, {
        scope: ResourceScope.meeting,
        meetingId,
      }),
    ]);

    return this.briefBuilder.build({
      user: user.map(toBriefSource),
      project: project.map(toBriefSource),
      meeting: meeting.map(toBriefSource),
    });
  }

  private maxTextChars(): number {
    return this.configService.getOrThrow<number>('RESOURCE_TEXT_MAX_CHARS');
  }

  private async requireOwned(userId: string, resourceId: string): Promise<Resource> {
    const resource = await this.resourcesRepository.findOwned(userId, resourceId);

    if (!resource) {
      throw new NotFoundException('Material not found');
    }

    return resource;
  }
}

function toBriefSource(resource: Resource): BriefSource {
  return { name: resource.name, body: resource.digest ?? resource.text ?? '' };
}
