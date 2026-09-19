import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GetCurrentUserId } from '~/common/decorators';
import { MessageResponse } from '~/common/dto';
import { openSseStream, writeSseEvent } from '~/common/sse';
import { ChatService } from './chat.service';
import { AskDto, ListChatsDto } from './dto/chat.dto';
import { ChatMessageResponse, ChatSessionResponse } from './dto/chat.responses';

@ApiTags('chat')
@Controller('meetings')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':id/chats')
  @ApiOperation({
    summary: 'Chats about this meeting, most recently used first',
    description: 'A query narrows them to the ones whose name or messages contain it.',
  })
  @ApiOkResponse({ type: [ChatSessionResponse] })
  sessions(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Query() dto: ListChatsDto,
  ): Promise<ChatSessionResponse[]> {
    return this.chatService.sessions(userId, meetingId, dto.query);
  }

  @Post(':id/chats')
  @ApiOperation({ summary: 'Start another chat about this meeting' })
  @ApiCreatedResponse({ type: ChatSessionResponse })
  createSession(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
  ): Promise<ChatSessionResponse> {
    return this.chatService.createSession(userId, meetingId);
  }

  @Delete(':id/chats/:chatId')
  @ApiOperation({ summary: 'Delete this chat with everything asked in it' })
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Param('chatId', ParseUUIDPipe) sessionId: string,
  ): Promise<MessageResponse> {
    await this.chatService.deleteSession(userId, meetingId, sessionId);

    return { message: 'Done' };
  }

  @Get(':id/chats/:chatId')
  @ApiOperation({ summary: 'Questions and answers in this chat, oldest first' })
  @ApiOkResponse({ type: [ChatMessageResponse] })
  messages(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Param('chatId', ParseUUIDPipe) sessionId: string,
  ): Promise<ChatMessageResponse[]> {
    return this.chatService.messages(userId, meetingId, sessionId);
  }

  @Post(':id/chats/:chatId')
  @ApiOperation({
    summary: 'Ask in this chat and stream the answer back',
    description: 'Emits delta events with text, then a single done or error event.',
  })
  async ask(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Param('chatId', ParseUUIDPipe) sessionId: string,
    @Body() dto: AskDto,
    @Res() res: Response,
  ): Promise<void> {
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    const events = await this.chatService.ask(
      userId,
      meetingId,
      sessionId,
      dto.question,
      abort.signal,
    );

    openSseStream(res);

    for await (const event of events) {
      writeSseEvent(res, event);
    }

    res.end();
  }
}
