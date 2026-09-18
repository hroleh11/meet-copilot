import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthRepository } from './auth.repository';

@Injectable()
export class ExpiredSessionsCleaner {
  private readonly logger = new Logger(ExpiredSessionsCleaner.name);

  constructor(private readonly authRepository: AuthRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<number> {
    const removed = await this.authRepository.deleteExpiredSessions(new Date());

    if (removed > 0) {
      this.logger.log(`Removed ${removed} expired sessions`);
    }

    return removed;
  }
}
