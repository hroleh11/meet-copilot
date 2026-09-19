import { Injectable } from '@nestjs/common';
import { fence } from '~/common/untrusted';
import type { ChatMessage } from '~/generated/prisma/client';
import type { Language } from '~/generated/prisma/enums';
import type { LlmItem } from '~/infrastructure/llm';
import { languageName } from '~/modules/generation';
import type { MeetingDetailsResponse } from '~/modules/meetings';
import { CHAT_PERSONA_PROMPT, meetingDayNote } from './prompts/chat.prompt';

const TRANSCRIPT_INLINE_MAX_CHARS = 12_000;
const HISTORY_TURNS = 6;

export interface ChatPromptInput {
  language: Language;
  today: string;
  materials: string | null;
  notes: string | null;
  details: MeetingDetailsResponse;
  history: ChatMessage[];
  question: string;
}

export interface ChatPrompt {
  system: string;
  items: LlmItem[];
}

/// A short meeting travels with the prompt, because reading it costs one call the
/// model would make anyway. A long one only announces itself, and the tools bring
/// the parts the question turns out to need.
@Injectable()
export class ChatPromptBuilder {
  build(input: ChatPromptInput): ChatPrompt {
    const items: LlmItem[] = [{ kind: 'message', role: 'user', text: context(input) }];

    for (const turn of input.history.slice(-HISTORY_TURNS)) {
      items.push({
        kind: 'message',
        role: 'user',
        text: fence('question', turn.question),
      });
      items.push({ kind: 'message', role: 'assistant', text: turn.answer });
    }

    items.push({
      kind: 'message',
      role: 'user',
      text: [
        fence('question', input.question),
        `Answer in ${languageName(input.language)}.`,
        meetingDayNote(input.today),
      ].join('\n\n'),
    });

    return { system: CHAT_PERSONA_PROMPT, items };
  }
}

function context(input: ChatPromptInput): string {
  const blocks: string[] = [];

  if (input.materials) {
    blocks.push(input.materials);
  }

  if (input.notes) {
    blocks.push(fence('notes', input.notes));
  }

  const lines = transcript(input.details);

  blocks.push(
    lines.length <= TRANSCRIPT_INLINE_MAX_CHARS
      ? fence('transcript', lines)
      : `The transcript is ${input.details.segments.length} lines long, too long to put here. Read it with the tools.`,
  );

  return blocks.join('\n\n');
}

function transcript(details: MeetingDetailsResponse): string {
  return details.segments
    .map((segment, index) => `${index + 1}. [${segment.speaker}] ${segment.text}`)
    .join('\n');
}
