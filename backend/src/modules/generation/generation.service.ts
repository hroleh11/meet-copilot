import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { GenerationMode } from '~/generated/prisma/enums';
import { LlmProvider, type LlmEffort, type LlmUsage } from '~/infrastructure/llm';
import { ContextWindow } from '~/modules/context';
import {
  MeetingStateStore,
  MeetingsService,
  type MeetingScreenshot,
} from '~/modules/meetings';
import { UsageRecorder } from '~/modules/usage';
import { GenerationRepository } from './generation.repository';
import { PromptBuilder, type Prompt } from './prompt.builder';
import type { GenerationEvent } from './types/generation.types';

const REPLY_MAX_TOKENS = 2_000;
const EMPTY_USAGE: LlmUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly meetingStateStore: MeetingStateStore,
    private readonly contextWindow: ContextWindow,
    private readonly promptBuilder: PromptBuilder,
    private readonly generationRepository: GenerationRepository,
    private readonly llmProvider: LlmProvider,
    private readonly usageRecorder: UsageRecorder,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async start(
    userId: string,
    meetingId: string,
    mode: GenerationMode,
    screenshot: MeetingScreenshot | null,
    signal: AbortSignal,
  ): Promise<AsyncIterable<GenerationEvent>> {
    const meeting = await this.meetingsService.requireOwned(userId, meetingId);

    if (meeting.status !== 'live') {
      throw new ConflictException('This meeting is already finished');
    }

    const state = await this.meetingStateStore.readState(meetingId);

    if (!state) {
      throw new ConflictException('The live state of this meeting has expired');
    }

    const [{ recent }, summary, previousAnswer] = await Promise.all([
      this.contextWindow.read(meetingId),
      this.meetingStateStore.readSummary(meetingId),
      mode === 'alternative'
        ? this.meetingStateStore.readLastAnswer(meetingId)
        : Promise.resolve(null),
    ]);

    const image = await this.resolveScreenshot(meetingId, screenshot);

    const prompt = this.promptBuilder.build({
      state,
      summary,
      recent,
      previousAnswer,
      mode,
      hasScreenshot: image !== null,
    });

    return this.run(meetingId, userId, mode, prompt, image, signal);
  }

  /// A screenshot stays on the table until it expires or a newer one replaces
  /// it: the question after it is usually about the same screen.
  private async resolveScreenshot(
    meetingId: string,
    screenshot: MeetingScreenshot | null,
  ): Promise<MeetingScreenshot | null> {
    if (!screenshot) {
      return this.meetingStateStore.readScreenshot(meetingId);
    }

    await this.meetingStateStore.writeScreenshot(meetingId, screenshot);

    return screenshot;
  }

  private async *run(
    meetingId: string,
    userId: string,
    mode: GenerationMode,
    prompt: Prompt,
    image: MeetingScreenshot | null,
    signal: AbortSignal,
  ): AsyncIterable<GenerationEvent> {
    const model = this.configService.getOrThrow<string>('REPLY_MODEL');
    let output = '';
    let stopReason: string | null = 'cancelled';
    let usage = EMPTY_USAGE;

    try {
      const events = this.llmProvider.stream(
        {
          model,
          effort: this.configService.getOrThrow<LlmEffort>('REPLY_EFFORT'),
          maxTokens: REPLY_MAX_TOKENS,
          system: prompt.system,
          blocks: prompt.blocks,
          ...(image ? { image } : {}),
        },
        signal,
      );

      for await (const event of events) {
        if (event.type === 'delta') {
          output += event.text;
          yield { type: 'delta', data: { text: event.text } };
          continue;
        }

        stopReason = event.stopReason;
        usage = event.usage;
      }
    } catch (error) {
      if (!signal.aborted) {
        this.logger.error(
          `Generation failed for meeting ${meetingId}`,
          error instanceof Error ? error.stack : String(error),
        );
        yield { type: 'error', data: { message: 'Could not draft an answer' } };
        return;
      }
    }

    const generationId = await this.persist(meetingId, userId, mode, {
      model,
      output,
      stopReason,
      usage,
      hasScreenshot: image !== null,
    });

    if (!signal.aborted) {
      yield { type: 'done', data: { generationId, stopReason, usage } };
    }
  }

  private async persist(
    meetingId: string,
    userId: string,
    mode: GenerationMode,
    result: {
      model: string;
      output: string;
      stopReason: string | null;
      usage: LlmUsage;
      hasScreenshot: boolean;
    },
  ): Promise<string> {
    const generation = await this.generationRepository.create({
      meetingId,
      mode,
      output: result.output,
      stopReason: result.stopReason,
      hasScreenshot: result.hasScreenshot,
      ...result.usage,
    });

    if (result.output) {
      await this.meetingStateStore.writeLastAnswer(meetingId, result.output);
    }

    await this.usageRecorder.record({
      userId,
      meetingId,
      kind: 'generate',
      model: result.model,
      ...result.usage,
    });

    return generation.id;
  }
}
