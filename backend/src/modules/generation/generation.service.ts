import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import { GenerationMode } from '~/generated/prisma/enums';
import { LlmProvider, type LlmEffort, type LlmUsage } from '~/infrastructure/llm';
import { ContextWindow, formatTranscript, segmentsAfter } from '~/modules/context';
import {
  MeetingStateStore,
  MeetingsService,
  type MeetingScreenshot,
  type MeetingTurn,
} from '~/modules/meetings';
import { UsageRecorder } from '~/modules/usage';
import { GenerationRepository } from './generation.repository';
import { PromptBuilder, type Prompt } from './prompt.builder';
import type { GenerationEvent } from './types/generation.types';

const REPLY_MAX_TOKENS = 2_000;
const EMPTY_USAGE: LlmUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };

interface Draft {
  meetingId: string;
  userId: string;
  mode: GenerationMode;
  prompt: Prompt;
  turn: MeetingTurn;
  spokenUpTo: string | null;
}

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

    const [{ recent }, summary, turns, spokenUpTo] = await Promise.all([
      this.contextWindow.read(meetingId),
      this.meetingStateStore.readSummary(meetingId),
      this.meetingStateStore.readTurns(meetingId),
      this.meetingStateStore.readSpokenUpTo(meetingId),
    ]);

    const spoken = segmentsAfter(recent, spokenUpTo);

    return this.run(
      {
        meetingId,
        userId,
        mode,
        prompt: this.promptBuilder.build({
          state,
          summary,
          turns,
          spoken,
          screenshot,
          mode,
        }),
        turn: {
          question: formatTranscript(spoken),
          answer: '',
          ...(screenshot ? { screenshot } : {}),
        },
        spokenUpTo: recent.at(-1)?.id ?? null,
      },
      signal,
    );
  }

  private async *run(draft: Draft, signal: AbortSignal): AsyncIterable<GenerationEvent> {
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
          system: draft.prompt.system,
          messages: draft.prompt.messages,
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
          `Generation failed for meeting ${draft.meetingId}`,
          error instanceof Error ? error.stack : String(error),
        );
        yield { type: 'error', data: { message: 'Could not draft an answer' } };
        return;
      }
    }

    const generationId = await this.persist(draft, { model, output, stopReason, usage });

    if (!signal.aborted) {
      yield { type: 'done', data: { generationId, stopReason, usage } };
    }
  }

  private async persist(
    draft: Draft,
    result: {
      model: string;
      output: string;
      stopReason: string | null;
      usage: LlmUsage;
    },
  ): Promise<string> {
    const generation = await this.generationRepository.create({
      meetingId: draft.meetingId,
      mode: draft.mode,
      output: result.output,
      stopReason: result.stopReason,
      hasScreenshot: draft.prompt.messages.some((message) => message.image !== undefined),
      ...result.usage,
    });

    if (result.output) {
      await this.remember(draft, result.output);
    }

    await this.usageRecorder.record({
      userId: draft.userId,
      meetingId: draft.meetingId,
      kind: 'generate',
      model: result.model,
      ...result.usage,
    });

    return generation.id;
  }

  private async remember(draft: Draft, answer: string): Promise<void> {
    if (draft.mode === GenerationMode.alternative) {
      await this.meetingStateStore.replaceLastAnswer(draft.meetingId, {
        ...draft.turn,
        answer,
      });
      return;
    }

    await this.meetingStateStore.appendTurn(draft.meetingId, { ...draft.turn, answer });

    if (draft.spokenUpTo) {
      await this.meetingStateStore.writeSpokenUpTo(draft.meetingId, draft.spokenUpTo);
    }
  }
}
