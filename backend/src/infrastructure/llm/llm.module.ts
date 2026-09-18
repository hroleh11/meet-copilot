import { Global, Module } from '@nestjs/common';
import { LlmProvider } from './llm.provider';
import { OpenAiLlmProvider } from './openai-llm.provider';

@Global()
@Module({
  providers: [{ provide: LlmProvider, useClass: OpenAiLlmProvider }],
  exports: [LlmProvider],
})
export class LlmProviderModule {}
