import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import {
  LlmProvider,
  type LlmEffort,
  type LlmItem,
  type LlmToolCall,
  type LlmUsage,
} from '~/infrastructure/llm';
import type { ChatPrompt } from './chat.prompt.builder';
import { MEETING_TOOLS } from './tools/meeting.tools';
import type { MeetingToolbox } from './tools/meeting.toolbox';
import type { AgentEvent } from './types/chat.types';

const CHAT_MAX_TOKENS = 4_000;
const MAX_TURNS = 6;

/// The model works the meeting rather than being handed a fixed extract: it asks
/// for facts, searches the transcript, then answers. Each turn continues the one
/// before it by handle, so the provider keeps its own reasoning and only the tool
/// results travel back.
@Injectable()
export class ChatAgent {
  constructor(
    private readonly llmProvider: LlmProvider,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async *run(
    prompt: ChatPrompt,
    toolbox: MeetingToolbox,
    signal: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    const model = this.configService.getOrThrow<string>('REPLY_MODEL');
    const request = {
      model,
      effort: this.configService.getOrThrow<LlmEffort>('REPLY_EFFORT'),
      maxTokens: CHAT_MAX_TOKENS,
      system: prompt.system,
      tools: MEETING_TOOLS,
    };

    const usage: LlmUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
    let items = prompt.items;
    let handle: string | undefined;

    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      const calls: LlmToolCall[] = [];
      let stopReason: string | null = null;

      const events = this.llmProvider.streamTools(
        { ...request, items, continueFrom: handle },
        signal,
      );

      for await (const event of events) {
        if (event.type === 'delta') {
          yield { type: 'delta', text: event.text };
          continue;
        }

        if (event.type === 'toolCall') {
          calls.push(event.call);
          continue;
        }

        stopReason = event.stopReason;
        handle = event.handle ?? undefined;
        add(usage, event.usage);
      }

      if (calls.length === 0) {
        yield { type: 'done', model, stopReason, usage };
        return;
      }

      items = calls.map((call) => answer(call, toolbox));
    }

    yield { type: 'done', model, stopReason: 'tool_turns_exhausted', usage };
  }
}

function answer(call: LlmToolCall, toolbox: MeetingToolbox): LlmItem {
  return {
    kind: 'toolResult',
    callId: call.callId,
    output: toolbox.run(call.name, call.arguments),
  };
}

function add(total: LlmUsage, turn: LlmUsage): void {
  total.inputTokens += turn.inputTokens;
  total.cachedInputTokens += turn.cachedInputTokens;
  total.outputTokens += turn.outputTokens;
}
