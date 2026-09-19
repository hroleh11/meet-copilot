import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ChatSession } from '~/generated/prisma/client';
import type { LlmUsage } from '~/infrastructure/llm';
import { MeetingsService } from '~/modules/meetings';
import { UsageRecorder } from '~/modules/usage';
import { ChatAgent } from './chat.agent';
import { toMessageResponse, toSessionResponse, toTitle } from './chat.mapper';
import { ChatPromptBuilder, type ChatPrompt } from './chat.prompt.builder';
import { ChatRepository } from './chat.repository';
import type { ChatMessageResponse, ChatSessionResponse } from './dto/chat.responses';
import { MeetingToolbox } from './tools/meeting.toolbox';
import type { ChatEvent } from './types/chat.types';

const DAY_LENGTH = 10;

interface Exchange {
  userId: string;
  meetingId: string;
  session: ChatSession;
  question: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly chatRepository: ChatRepository,
    private readonly promptBuilder: ChatPromptBuilder,
    private readonly agent: ChatAgent,
    private readonly usageRecorder: UsageRecorder,
  ) {}

  async sessions(
    userId: string,
    meetingId: string,
    query?: string,
  ): Promise<ChatSessionResponse[]> {
    await this.meetingsService.requireOwned(userId, meetingId);

    const sessions = await this.chatRepository.listSessions(meetingId, query);

    return sessions.map(toSessionResponse);
  }

  async createSession(userId: string, meetingId: string): Promise<ChatSessionResponse> {
    await this.meetingsService.requireOwned(userId, meetingId);

    const session = await this.chatRepository.createSession(meetingId);

    return toSessionResponse({ ...session, _count: { messages: 0 } });
  }

  async deleteSession(
    userId: string,
    meetingId: string,
    sessionId: string,
  ): Promise<void> {
    await this.meetingsService.requireOwned(userId, meetingId);
    await this.requireSession(meetingId, sessionId);
    await this.chatRepository.deleteSession(sessionId);
  }

  async messages(
    userId: string,
    meetingId: string,
    sessionId: string,
  ): Promise<ChatMessageResponse[]> {
    await this.meetingsService.requireOwned(userId, meetingId);
    await this.requireSession(meetingId, sessionId);

    const messages = await this.chatRepository.listMessages(sessionId);

    return messages.map(toMessageResponse);
  }

  async ask(
    userId: string,
    meetingId: string,
    sessionId: string,
    question: string,
    signal: AbortSignal,
  ): Promise<AsyncIterable<ChatEvent>> {
    const meeting = await this.meetingsService.requireOwned(userId, meetingId);
    const session = await this.requireSession(meetingId, sessionId);
    const [details, history] = await Promise.all([
      this.meetingsService.details(userId, meetingId),
      this.chatRepository.listMessages(sessionId),
    ]);

    const prompt = this.promptBuilder.build({
      language: meeting.language,
      today: meeting.startedAt.toISOString().slice(0, DAY_LENGTH),
      materials: meeting.contextBrief,
      notes: meeting.summary,
      details,
      history,
      question,
    });

    return this.run(
      { userId, meetingId, session, question },
      prompt,
      new MeetingToolbox(details),
      signal,
    );
  }

  private async *run(
    exchange: Exchange,
    prompt: ChatPrompt,
    toolbox: MeetingToolbox,
    signal: AbortSignal,
  ): AsyncIterable<ChatEvent> {
    let output = '';
    let model: string | null = null;
    let stopReason: string | null = 'cancelled';
    let usage: LlmUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };

    try {
      for await (const event of this.agent.run(prompt, toolbox, signal)) {
        if (event.type === 'delta') {
          output += event.text;
          yield { type: 'delta', data: { text: event.text } };
          continue;
        }

        model = event.model;
        stopReason = event.stopReason;
        usage = event.usage;
      }
    } catch (error) {
      if (!signal.aborted) {
        this.logger.error(
          `Chat failed for meeting ${exchange.meetingId}`,
          error instanceof Error ? error.stack : String(error),
        );
        yield { type: 'error', data: { message: 'Could not answer about this meeting' } };
        return;
      }
    }

    const message = await this.chatRepository.createMessage({
      sessionId: exchange.session.id,
      question: exchange.question,
      answer: output,
      title: exchange.session.title ? null : toTitle(exchange.question),
    });

    await this.usageRecorder.record({
      userId: exchange.userId,
      meetingId: exchange.meetingId,
      kind: 'chat',
      model,
      ...usage,
    });

    if (!signal.aborted) {
      yield { type: 'done', data: { messageId: message.id, stopReason, usage } };
    }
  }

  private async requireSession(
    meetingId: string,
    sessionId: string,
  ): Promise<ChatSession> {
    const session = await this.chatRepository.findSession(meetingId, sessionId);

    if (!session) {
      throw new NotFoundException('Chat not found');
    }

    return session;
  }
}
