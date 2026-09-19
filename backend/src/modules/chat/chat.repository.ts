import { Injectable } from '@nestjs/common';
import type { ChatMessage, ChatSession } from '~/generated/prisma/client';
import { PrismaService } from '~/infrastructure/prisma';

export type ChatSessionWithCount = ChatSession & { _count: { messages: number } };

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  listSessions(meetingId: string, query?: string): Promise<ChatSessionWithCount[]> {
    const matches = query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' as const } },
            {
              messages: {
                some: {
                  OR: [
                    { question: { contains: query, mode: 'insensitive' as const } },
                    { answer: { contains: query, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    return this.prisma.chatSession.findMany({
      where: { meetingId, ...matches },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  createSession(meetingId: string): Promise<ChatSession> {
    return this.prisma.chatSession.create({ data: { meetingId } });
  }

  findSession(meetingId: string, sessionId: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findFirst({ where: { id: sessionId, meetingId } });
  }

  listMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  async createMessage(data: {
    sessionId: string;
    question: string;
    answer: string;
    title: string | null;
  }): Promise<ChatMessage> {
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          sessionId: data.sessionId,
          question: data.question,
          answer: data.answer,
        },
      }),
      this.prisma.chatSession.update({
        where: { id: data.sessionId },
        data: data.title === null ? {} : { title: data.title },
      }),
    ]);

    return message;
  }
}
