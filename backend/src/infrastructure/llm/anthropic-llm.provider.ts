import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '~/common/config';
import { toHttpException } from './anthropic-error.mapper';
import {
  LlmProvider,
  type LlmCompletion,
  type LlmRequest,
  type LlmUsage,
} from './llm.provider';

@Injectable()
export class AnthropicLlmProvider extends LlmProvider {
  private readonly client: Anthropic;

  constructor(configService: ConfigService<Env, true>) {
    super();
    this.client = new Anthropic({
      apiKey: configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    try {
      const message = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        output_config: { effort: request.effort },
        system: [
          {
            type: 'text',
            text: request.system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: request.blocks.map((text) => ({ type: 'text' as const, text })),
          },
        ],
      });

      return {
        text: message.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n')
          .trim(),
        stopReason: message.stop_reason,
        usage: toUsage(message.usage),
      };
    } catch (error) {
      throw toHttpException(error);
    }
  }
}

function toUsage(usage: Anthropic.Usage): LlmUsage {
  return {
    inputTokens: usage.input_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
  };
}
