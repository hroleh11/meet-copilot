import { Module } from '@nestjs/common';
import { SettingsModule } from '~/modules/settings';
import { UsageModule } from '~/modules/usage';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [SettingsModule, UsageModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository, MeetingStateStore],
  exports: [MeetingsService, MeetingsRepository, MeetingStateStore],
})
export class MeetingsModule {}
