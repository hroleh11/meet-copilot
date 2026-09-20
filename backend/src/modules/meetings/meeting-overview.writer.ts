import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '~/common/config';
import type { Segment } from '~/generated/prisma/client';
import { LlmProvider, type LlmEffort } from '~/infrastructure/llm';
import { UsageRecorder } from '~/modules/usage';
import { MeetingsRepository, type MeetingWithContent } from './meetings.repository';
import { buildOverviewBlocks, OVERVIEW_SYSTEM_PROMPT } from './prompts/overview.prompt';

const OVERVIEW_MAX_TOKENS = 2_048;
const TRANSCRIPT_MAX_CHARS = 24_000;

/// The notes behind `summary` are dense on purpose, because the assistant answers
/// from them. What a person opening a finished meeting wants is three sentences,
/// so it is written once and kept. Two readers can arrive together, so a run in
/// flight is shared rather than started twice.
@Injectable()
export class MeetingOverviewWriter {
  private readonly logger = new Logger(MeetingOverviewWriter.name);
  private readonly running = new Map<string, Promise<string | null>>();

  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly llmProvider: LlmProvider,
    private readonly usageRecorder: UsageRecorder,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  ensure(meeting: MeetingWithContent, userId: string): Promise<string | null> {
    if (meeting.overview) {
      return Promise.resolve(meeting.overview);
    }

    if (meeting.status !== 'finished' || meeting.segments.length === 0) {
      return Promise.resolve(null);
    }

    const running = this.running.get(meeting.id);

    if (running) {
      return running;
    }

    const attempt = this.write(meeting, userId).finally(() => {
      this.running.delete(meeting.id);
    });

    this.running.set(meeting.id, attempt);

    return attempt;
  }

  async prepare(userId: string, meetingId: string): Promise<void> {
    const meeting = await this.meetingsRepository.findOwnedWithContent(userId, meetingId);

    if (meeting) {
      await this.ensure(meeting, userId);
    }
  }

  private async write(
    meeting: MeetingWithContent,
    userId: string,
  ): Promise<string | null> {
    const model = this.configService.getOrThrow<string>('SUMMARY_MODEL');

    try {
      const completion = await this.llmProvider.complete({
        model,
        effort: this.configService.getOrThrow<LlmEffort>('SUMMARY_EFFORT'),
        maxTokens: OVERVIEW_MAX_TOKENS,
        system: OVERVIEW_SYSTEM_PROMPT,
        blocks: buildOverviewBlocks(
          meeting.language,
          meeting.summary,
          transcript(meeting.segments),
        ),
      });

      if (!completion.text) {
        return null;
      }

      await this.meetingsRepository.updateOverview(meeting.id, completion.text);
      await this.usageRecorder.record({
        userId,
        meetingId: meeting.id,
        kind: 'summarize',
        model,
        ...completion.usage,
      });

      return completion.text;
    } catch (error) {
      this.logger.error(
        `Could not describe meeting ${meeting.id}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }
}

function transcript(segments: Segment[]): string {
  const lines = segments
    .map((segment) => `[${segment.speaker}] ${segment.text}`)
    .join('\n');

  return lines.length <= TRANSCRIPT_MAX_CHARS
    ? lines
    : lines.slice(0, TRANSCRIPT_MAX_CHARS);
}
