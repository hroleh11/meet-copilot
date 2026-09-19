import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ResponseUsage } from 'openai/resources/responses/responses';
import type { Env } from '~/common/config';
import type { LlmAgentEvent, LlmAgentRequest } from './llm.agent';
import {
  LlmProvider,
  type LlmCompletion,
  type LlmEvent,
  type LlmRequest,
  type LlmUsage,
} from './llm.provider';
import { toHttpException } from './openai-error.mapper';
import { toStreamInput } from './openai-input.mapper';
import { toFunctionTools, toResponseInput } from './openai-tools.mapper';

@Injectable()
export class OpenAiLlmProvider extends LlmProvider {
  private readonly client: OpenAI;

  constructor(configService: ConfigService<Env, true>) {
    super();
    this.client = new OpenAI({
      apiKey: configService.getOrThrow<string>('OPENAI_API_KEY'),
      timeout: configService.getOrThrow<number>('LLM_TIMEOUT_MS'),
    });
  }

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    try {
      const response = await this.client.responses.create({
        model: request.model,
        instructions: request.system,
        input: request.blocks.join('\n\n'),
        reasoning: { effort: request.effort },
        max_output_tokens: request.maxTokens,
      });

      return {
        text: response.output_text.trim(),
        stopReason: response.incomplete_details?.reason ?? response.status ?? null,
        usage: toUsage(response.usage),
      };
    } catch (error) {
      throw toHttpException(error);
    }
  }

  async *streamTools(
    request: LlmAgentRequest,
    signal: AbortSignal,
  ): AsyncIterable<LlmAgentEvent> {
    let events;

    try {
      events = await this.client.responses.create(
        {
          model: request.model,
          instructions: request.system,
          input: toResponseInput(request.items),
          tools: toFunctionTools(request.tools),
          reasoning: { effort: request.effort },
          max_output_tokens: request.maxTokens,
          stream: true,
          ...(request.continueFrom ? { previous_response_id: request.continueFrom } : {}),
        },
        { signal },
      );
    } catch (error) {
      throw toHttpException(error);
    }

    for await (const event of events) {
      if (event.type === 'response.output_text.delta') {
        yield { type: 'delta', text: event.delta };
        continue;
      }

      if (
        event.type === 'response.output_item.done' &&
        event.item.type === 'function_call'
      ) {
        yield {
          type: 'toolCall',
          call: {
            callId: event.item.call_id,
            name: event.item.name,
            arguments: event.item.arguments,
          },
        };
        continue;
      }

      if (
        event.type === 'response.completed' ||
        event.type === 'response.incomplete' ||
        event.type === 'response.failed'
      ) {
        yield {
          type: 'done',
          handle: event.response.id,
          stopReason:
            event.response.incomplete_details?.reason ?? event.response.status ?? null,
          usage: toUsage(event.response.usage),
        };
      }
    }
  }

  async *stream(request: LlmRequest, signal: AbortSignal): AsyncIterable<LlmEvent> {
    let events;

    try {
      events = await this.client.responses.create(
        {
          model: request.model,
          instructions: request.system,
          input: toStreamInput(request.blocks, request.image),
          reasoning: { effort: request.effort },
          max_output_tokens: request.maxTokens,
          stream: true,
        },
        { signal },
      );
    } catch (error) {
      throw toHttpException(error);
    }

    for await (const event of events) {
      if (event.type === 'response.output_text.delta') {
        yield { type: 'delta', text: event.delta };
        continue;
      }

      if (
        event.type === 'response.completed' ||
        event.type === 'response.incomplete' ||
        event.type === 'response.failed'
      ) {
        yield {
          type: 'done',
          stopReason:
            event.response.incomplete_details?.reason ?? event.response.status ?? null,
          usage: toUsage(event.response.usage),
        };
      }
    }
  }
}

function toUsage(usage: ResponseUsage | undefined): LlmUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}
