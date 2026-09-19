import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import { LlmProvider, type LlmEffort } from '~/infrastructure/llm';
import { UsageRecorder } from '~/modules/usage';
import { buildDigestBlocks, DIGEST_SYSTEM_PROMPT } from './prompts/digest.prompt';

const DIGEST_MAX_TOKENS = 4_096;

/// A long document is compressed once, when it arrives, instead of being cut on
/// every answer. The result rides in the cached prefix of every meeting that uses
/// it, so the cost is paid a single time per document.
@Injectable()
export class ResourceDigester {
  private readonly logger = new Logger(ResourceDigester.name);

  constructor(
    private readonly llmProvider: LlmProvider,
    private readonly usageRecorder: UsageRecorder,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async digest(
    userId: string,
    name: string,
    text: string,
    budgetChars: number,
  ): Promise<string | null> {
    const model = this.configService.getOrThrow<string>('SUMMARY_MODEL');

    try {
      const completion = await this.llmProvider.complete({
        model,
        effort: this.configService.getOrThrow<LlmEffort>('SUMMARY_EFFORT'),
        maxTokens: DIGEST_MAX_TOKENS,
        system: DIGEST_SYSTEM_PROMPT,
        blocks: buildDigestBlocks(name, text, budgetChars),
      });

      await this.usageRecorder.record({
        userId,
        kind: 'digest',
        model,
        ...completion.usage,
      });

      return completion.text || null;
    } catch (error) {
      this.logger.error(
        `Could not compress ${name}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }
}
