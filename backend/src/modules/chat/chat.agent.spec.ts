import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  LlmProvider,
  type LlmAgentEvent,
  type LlmAgentRequest,
} from '~/infrastructure/llm';
import { ChatAgent } from './chat.agent';
import type { ChatPrompt } from './chat.prompt.builder';
import { MEETING_FACTS } from './tools/meeting.tools';
import type { MeetingToolbox } from './tools/meeting.toolbox';

const USAGE = { inputTokens: 10, cachedInputTokens: 4, outputTokens: 2 };

class FakeLlmProvider extends LlmProvider {
  requests: LlmAgentRequest[] = [];

  complete(): never {
    throw new Error('The agent only streams');
  }

  stream(): AsyncIterable<never> {
    throw new Error('The agent only streams with tools');
  }

  async *streamTools(request: LlmAgentRequest): AsyncIterable<LlmAgentEvent> {
    this.requests.push(request);
    await Promise.resolve();

    if (this.requests.length === 1) {
      yield {
        type: 'toolCall',
        call: { callId: 'call-1', name: MEETING_FACTS, arguments: '{}' },
      };
      yield { type: 'done', handle: 'response-1', stopReason: 'completed', usage: USAGE };
      return;
    }

    yield { type: 'delta', text: 'Зустріч тривала 27 хвилин.' };
    yield { type: 'done', handle: 'response-2', stopReason: 'completed', usage: USAGE };
  }
}

const prompt: ChatPrompt = {
  system: 'persona',
  items: [{ kind: 'message', role: 'user', text: 'Скільки тривала зустріч?' }],
};

const toolbox = {
  run: (name: string) => JSON.stringify({ tool: name, durationSeconds: 1_650 }),
} as unknown as MeetingToolbox;

async function build(): Promise<{ agent: ChatAgent; llm: FakeLlmProvider }> {
  const llm = new FakeLlmProvider();
  const moduleRef = await Test.createTestingModule({
    providers: [
      ChatAgent,
      { provide: LlmProvider, useValue: llm },
      { provide: ConfigService, useValue: { getOrThrow: () => 'gpt-test' } },
    ],
  }).compile();

  return { agent: moduleRef.get(ChatAgent), llm };
}

describe('ChatAgent', () => {
  it('answers the second turn with what the tool reported', async () => {
    const { agent, llm } = await build();
    const events = [];

    for await (const event of agent.run(prompt, toolbox, new AbortController().signal)) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'delta', text: 'Зустріч тривала 27 хвилин.' },
      {
        type: 'done',
        model: 'gpt-test',
        stopReason: 'completed',
        usage: { inputTokens: 20, cachedInputTokens: 8, outputTokens: 4 },
      },
    ]);

    expect(llm.requests[1]).toMatchObject({
      continueFrom: 'response-1',
      items: [
        {
          kind: 'toolResult',
          callId: 'call-1',
          output: JSON.stringify({ tool: MEETING_FACTS, durationSeconds: 1_650 }),
        },
      ],
    });
  });
});
