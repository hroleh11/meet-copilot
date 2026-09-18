import { Global, Module } from '@nestjs/common';
import { AnthropicLlmProvider } from './anthropic-llm.provider';
import { LlmProvider } from './llm.provider';

@Global()
@Module({
  providers: [{ provide: LlmProvider, useClass: AnthropicLlmProvider }],
  exports: [LlmProvider],
})
export class LlmProviderModule {}
