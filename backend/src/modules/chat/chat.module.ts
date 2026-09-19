import { Module } from '@nestjs/common';
import { MeetingsModule } from '~/modules/meetings';
import { UsageModule } from '~/modules/usage';
import { ChatAgent } from './chat.agent';
import { ChatController } from './chat.controller';
import { ChatPromptBuilder } from './chat.prompt.builder';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  imports: [MeetingsModule, UsageModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatPromptBuilder, ChatAgent],
})
export class ChatModule {}
