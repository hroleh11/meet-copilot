import type { ChatMessage } from '~/generated/prisma/client';
import type { ChatSessionWithCount } from './chat.repository';
import type { ChatMessageResponse, ChatSessionResponse } from './dto/chat.responses';

const TITLE_MAX_CHARS = 60;

export function toSessionResponse(session: ChatSessionWithCount): ChatSessionResponse {
  return {
    id: session.id,
    title: session.title,
    messageCount: session._count.messages,
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toMessageResponse(message: ChatMessage): ChatMessageResponse {
  return {
    id: message.id,
    question: message.question,
    answer: message.answer,
    createdAt: message.createdAt.toISOString(),
  };
}

/// A chat is found again by what was asked first, so the first question becomes
/// the name and nothing else ever renames it.
export function toTitle(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, ' ');

  return trimmed.length <= TITLE_MAX_CHARS
    ? trimmed
    : `${trimmed.slice(0, TITLE_MAX_CHARS).trimEnd()}…`;
}
