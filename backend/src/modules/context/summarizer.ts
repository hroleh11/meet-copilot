import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import { LlmProvider, type LlmEffort } from '~/infrastructure/llm';
import {
  MeetingStateStore,
  MeetingsRepository,
  type WindowSegment,
} from '~/modules/meetings';
import { UsageRecorder } from '~/modules/usage';
import { ContextWindow } from './context-window';
import { buildSummaryBlocks, SUMMARY_SYSTEM_PROMPT } from './prompts/summary.prompt';
import { countCharacters, formatTranscript } from './transcript.formatter';

const LOCK_TTL_SECONDS = 120;
const SUMMARY_MAX_TOKENS = 4_096;

@Injectable()
export class Summarizer {
  private readonly logger = new Logger(Summarizer.name);

  constructor(
    private readonly contextWindow: ContextWindow,
    private readonly meetingStateStore: MeetingStateStore,
    private readonly meetingsRepository: MeetingsRepository,
    private readonly llmProvider: LlmProvider,
    private readonly usageRecorder: UsageRecorder,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async maybeRun(meetingId: string, userId: string): Promise<void> {
    const { recent, stale } = await this.contextWindow.read(meetingId);
    const trigger = this.configService.getOrThrow<number>('SUMMARY_TRIGGER_CHARS');

    if (countCharacters(stale) < trigger) {
      return;
    }

    if (!(await this.meetingStateStore.claimSummarize(meetingId, LOCK_TTL_SECONDS))) {
      return;
    }

    try {
      await this.compress(meetingId, userId, stale, recent.length);
    } catch (error) {
      this.logger.error(
        `Could not summarize meeting ${meetingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      await this.meetingStateStore.releaseSummarize(meetingId);
    }
  }

  private async compress(
    meetingId: string,
    userId: string,
    stale: WindowSegment[],
    keepLast: number,
  ): Promise<void> {
    const state = await this.meetingStateStore.readState(meetingId);

    if (!state) {
      return;
    }

    const previous = await this.meetingStateStore.readSummary(meetingId);
    const model = this.configService.getOrThrow<string>('SUMMARY_MODEL');
    const completion = await this.llmProvider.complete({
      model,
      effort: this.configService.getOrThrow<LlmEffort>('SUMMARY_EFFORT'),
      maxTokens: SUMMARY_MAX_TOKENS,
      system: SUMMARY_SYSTEM_PROMPT,
      blocks: buildSummaryBlocks(state.language, previous, formatTranscript(stale)),
    });

    if (!completion.text) {
      return;
    }

    await this.meetingStateStore.writeSummary(meetingId, completion.text);
    await this.meetingsRepository.updateSummary(meetingId, completion.text);
    await this.meetingStateStore.trimWindow(meetingId, keepLast);
    await this.usageRecorder.record({
      userId,
      meetingId,
      kind: 'summarize',
      model,
      ...completion.usage,
    });
  }
}
