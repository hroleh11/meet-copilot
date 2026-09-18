import { Injectable } from '@nestjs/common';
import type { GenerationMode } from '~/generated/prisma/enums';
import { formatTranscript } from '~/modules/context';
import type { MeetingLiveState, WindowSegment } from '~/modules/meetings';
import { languageInstruction, MODE_PROMPTS } from './prompts/mode.prompts';
import { DEFAULT_STYLE, PERSONA_PROMPT } from './prompts/persona.prompt';
import { PROFILE_PROMPTS } from './prompts/profile.prompts';

export interface PromptInput {
  state: MeetingLiveState;
  summary: string | null;
  recent: WindowSegment[];
  previousAnswer: string | null;
  mode: GenerationMode;
}

export interface Prompt {
  system: string;
  blocks: string[];
}

@Injectable()
export class PromptBuilder {
  build(input: PromptInput): Prompt {
    return {
      system: buildSystem(input.state),
      blocks: buildBlocks(input),
    };
  }
}

function buildSystem(state: MeetingLiveState): string {
  return [
    PERSONA_PROMPT,
    PROFILE_PROMPTS[state.profile],
    state.style.trim() || DEFAULT_STYLE,
  ].join('\n\n');
}

function buildBlocks(input: PromptInput): string[] {
  const blocks: string[] = [];

  if (input.summary) {
    blocks.push(`Notes so far:\n${input.summary}`);
  }

  if (input.recent.length > 0) {
    blocks.push(`Recent transcript:\n${formatTranscript(input.recent)}`);
  }

  if (input.mode === 'alternative' && input.previousAnswer) {
    blocks.push(`Answer already drafted:\n${input.previousAnswer}`);
  }

  blocks.push(MODE_PROMPTS[input.mode]);
  blocks.push(languageInstruction(input.state.language));

  return blocks;
}
