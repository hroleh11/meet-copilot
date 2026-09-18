import { Module } from '@nestjs/common';
import { ContextModule } from '~/modules/context';
import { MeetingsModule } from '~/modules/meetings';
import { UsageModule } from '~/modules/usage';
import { GenerationController } from './generation.controller';
import { GenerationRepository } from './generation.repository';
import { GenerationService } from './generation.service';
import { PromptBuilder } from './prompt.builder';

@Module({
  imports: [ContextModule, MeetingsModule, UsageModule],
  controllers: [GenerationController],
  providers: [GenerationService, GenerationRepository, PromptBuilder],
})
export class GenerationModule {}
