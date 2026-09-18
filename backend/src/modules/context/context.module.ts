import { Module } from '@nestjs/common';
import { MeetingsModule } from '~/modules/meetings';
import { UsageModule } from '~/modules/usage';
import { ContextWindow } from './context-window';
import { Summarizer } from './summarizer';

@Module({
  imports: [MeetingsModule, UsageModule],
  providers: [ContextWindow, Summarizer],
  exports: [ContextWindow, Summarizer],
})
export class ContextModule {}
