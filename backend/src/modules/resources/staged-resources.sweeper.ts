import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Env } from '~/common/config';
import { ObjectStorage } from '~/infrastructure/storage';
import { ResourcesRepository } from './resources.repository';

const MILLISECONDS_PER_HOUR = 3_600_000;

/// A material uploaded for a meeting that never started belongs to nobody. That is
/// the price of not inventing a draft meeting to hold it, and it is one query.
@Injectable()
export class StagedResourcesSweeper {
  private readonly logger = new Logger(StagedResourcesSweeper.name);

  constructor(
    private readonly resourcesRepository: ResourcesRepository,
    private readonly storage: ObjectStorage,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<number> {
    const hours = this.configService.getOrThrow<number>('STAGED_RESOURCE_TTL_HOURS');
    const createdBefore = new Date(Date.now() - hours * MILLISECONDS_PER_HOUR);
    const staged = await this.resourcesRepository.listStagedBefore(createdBefore);

    for (const resource of staged) {
      if (resource.storageKey) {
        await this.storage.delete(resource.storageKey);
      }

      await this.resourcesRepository.delete(resource.id);
    }

    if (staged.length > 0) {
      this.logger.log(`Swept ${staged.length} materials no meeting ever claimed`);
    }

    return staged.length;
  }
}
