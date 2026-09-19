import { Injectable, Logger } from '@nestjs/common';
import type { Resource } from '~/generated/prisma/client';
import { ResourceFailure } from '~/generated/prisma/enums';
import { ObjectStorage } from '~/infrastructure/storage';
import { briefBudget } from './context-brief.builder';
import { ResourceDigester } from './resource.digester';
import { ResourceExtractor } from './resource.extractor';
import { ResourcesRepository } from './resources.repository';

class UnusableResource extends Error {
  constructor(readonly failure: ResourceFailure) {
    super(failure);
  }
}

/// Reading a document is slow enough to outlive a request, so upload answers with
/// a pending row and this runs behind it. The desktop polls the row until it is
/// ready, which is also what the start button waits for.
@Injectable()
export class ResourceIngestor {
  private readonly logger = new Logger(ResourceIngestor.name);

  constructor(
    private readonly storage: ObjectStorage,
    private readonly extractor: ResourceExtractor,
    private readonly digester: ResourceDigester,
    private readonly resourcesRepository: ResourcesRepository,
  ) {}

  async ingest(resource: Resource, bytes: Buffer): Promise<void> {
    try {
      const text = await this.read(resource, bytes);
      await this.store(resource, bytes);
      await this.ready(resource, text);
    } catch (error) {
      this.logger.error(
        `Could not take in resource ${resource.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.fail(resource.id, failureOf(error));
    }
  }

  async ready(resource: Resource, text: string): Promise<void> {
    const budget = briefBudget(resource.scope);
    const digest =
      text.length <= budget
        ? null
        : await this.digester.digest(resource.userId, resource.name, text, budget);

    await this.resourcesRepository.update(resource.id, {
      status: 'ready',
      failure: null,
      text,
      digest,
      chars: text.length,
    });
  }

  private async read(resource: Resource, bytes: Buffer): Promise<string> {
    const text = await this.extractor
      .extract(resource.kind, bytes)
      .catch((error: unknown) => {
        throw asUnusable(error, ResourceFailure.unreadable);
      });

    if (!text) {
      throw new UnusableResource(ResourceFailure.no_text_layer);
    }

    return text;
  }

  private async store(resource: Resource, bytes: Buffer): Promise<void> {
    if (!resource.storageKey) {
      return;
    }

    await this.storage
      .put({ key: resource.storageKey, mimeType: resource.mimeType, bytes })
      .catch((error: unknown) => {
        throw asUnusable(error, ResourceFailure.storage);
      });
  }

  private async fail(resourceId: string, failure: ResourceFailure): Promise<void> {
    await this.resourcesRepository.update(resourceId, { status: 'failed', failure });
  }
}

function asUnusable(error: unknown, failure: ResourceFailure): Error {
  const unusable = new UnusableResource(failure);
  unusable.cause = error;

  return unusable;
}

function failureOf(error: unknown): ResourceFailure {
  return error instanceof UnusableResource ? error.failure : ResourceFailure.unreadable;
}
