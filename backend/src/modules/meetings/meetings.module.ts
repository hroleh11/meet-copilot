import { Module } from '@nestjs/common';
import { ProjectsModule } from '~/modules/projects';
import { ResourcesModule } from '~/modules/resources';
import { SettingsModule } from '~/modules/settings';
import { UsageModule } from '~/modules/usage';
import { MeetingOverviewWriter } from './meeting-overview.writer';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';
import { StaleMeetingsCloser } from './stale-meetings.closer';

@Module({
  imports: [ProjectsModule, ResourcesModule, SettingsModule, UsageModule],
  controllers: [MeetingsController],
  providers: [
    MeetingsService,
    MeetingsRepository,
    MeetingStateStore,
    MeetingOverviewWriter,
    StaleMeetingsCloser,
  ],
  exports: [MeetingsService, MeetingsRepository, MeetingStateStore, StaleMeetingsCloser],
})
export class MeetingsModule {}
