import { Module } from '@nestjs/common';
import { UsageRecorder } from './usage.recorder';
import { UsageRepository } from './usage.repository';

@Module({
  providers: [UsageRecorder, UsageRepository],
  exports: [UsageRecorder, UsageRepository],
})
export class UsageModule {}
