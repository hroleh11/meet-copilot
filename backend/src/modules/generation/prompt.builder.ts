import { Injectable } from '@nestjs/common';
import type { GenerationMode } from '~/generated/prisma/enums';
import type { LlmMessage } from '~/infrastructure/llm';
import { formatTranscript } from '~/modules/context';
import type {
  MeetingLiveState,
  MeetingScreenshot,
  MeetingTurn,
  WindowSegment,
} from '~/modules/meetings';
import {
  languageInstruction,
  todayNote,
  MODE_PROMPTS,
  NOTHING_SAID,
  SCREENSHOT_NOTE,
} from './prompts/mode.prompts';
import { DEFAULT_STYLE, MATERIALS_RULE, PERSONA_PROMPT } from './prompts/persona.prompt';
import { PROFILE_PROMPTS } from './prompts/profile.prompts';

export interface PromptInput {
  state: MeetingLiveState;
  summary: string | null;
  turns: MeetingTurn[];
  spoken: WindowSegment[];
  screenshot: MeetingScreenshot | null;
  mode: GenerationMode;
}

export interface Prompt {
  system: string;
  messages: LlmMessage[];
}

@Injectable()
export class PromptBuilder {
  build(input: PromptInput): Prompt {
    return {
      system: buildSystem(input.state),
      messages: buildMessages(input),
    };
  }
}

function buildSystem(state: MeetingLiveState): string {
  const brief = state.contextBrief.trim();

  return [
    PERSONA_PROMPT,
    PROFILE_PROMPTS[state.profile],
    state.style.trim() || DEFAULT_STYLE,
    ...(brief ? [MATERIALS_RULE, brief] : []),
    languageInstruction(state.language),
  ].join('\n\n');
}

function buildMessages(input: PromptInput): LlmMessage[] {
  const messages: LlmMessage[] = [];

  if (input.summary) {
    messages.push({ role: 'user', text: `Notes so far:\n${input.summary}` });
  }

  for (const turn of input.turns) {
    messages.push(
      said(turn.question, input.screenshot ? null : (turn.screenshot ?? null)),
    );
    messages.push({ role: 'assistant', text: turn.answer });
  }

  const now = said(formatTranscript(input.spoken), input.screenshot);
  const asked = [
    MODE_PROMPTS[input.mode],
    ...(input.state.today ? [todayNote(input.state.today)] : []),
  ].join('\n\n');

  messages.push({ ...now, text: `${now.text}\n\n${asked}` });

  return messages;
}

function said(transcript: string, screenshot: MeetingScreenshot | null): LlmMessage {
  const heard = transcript || NOTHING_SAID;

  return screenshot
    ? { role: 'user', text: `${heard}\n\n${SCREENSHOT_NOTE}`, image: screenshot }
    : { role: 'user', text: heard };
}
