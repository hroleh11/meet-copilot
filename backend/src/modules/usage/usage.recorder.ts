import { Injectable, Logger } from '@nestjs/common';
import type { UsageRecord } from './types/usage.types';
import { UsageRepository } from './usage.repository';

@Injectable()
export class UsageRecorder {
  private readonly logger = new Logger(UsageRecorder.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async record(usage: UsageRecord): Promise<void> {
    try {
      await this.usageRepository.create(usage);
    } catch (error) {
      this.logger.error(
        `Failed to record ${usage.kind} usage for user ${usage.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
