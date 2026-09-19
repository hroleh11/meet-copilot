import type {
  GenerationResponse,
  MeetingDetailsResponse,
  SegmentResponse,
} from '~/modules/meetings';
import {
  LIST_ANSWERS,
  MEETING_FACTS,
  READ_TRANSCRIPT,
  SEARCH_TRANSCRIPT,
} from './meeting.tools';

const SEARCH_LIMIT = 20;
const READ_COUNT = 60;

interface Arguments {
  query?: unknown;
  limit?: unknown;
  from?: unknown;
  count?: unknown;
}

/// The meeting is already loaded for the prompt, so every tool answers from that
/// one read. Line numbers are the order of the transcript, not a clock: a segment
/// carries the offset inside its own audio lane, which restarts on a reconnect.
export class MeetingToolbox {
  constructor(private readonly details: MeetingDetailsResponse) {}

  run(name: string, rawArguments: string): string {
    const parsed = parse(rawArguments);

    if (!parsed) {
      return json({ error: 'The arguments were not valid JSON' });
    }

    switch (name) {
      case MEETING_FACTS:
        return json(this.facts());
      case SEARCH_TRANSCRIPT:
        return json(this.search(text(parsed.query), count(parsed.limit, SEARCH_LIMIT)));
      case READ_TRANSCRIPT:
        return json(this.read(count(parsed.from, 1), count(parsed.count, READ_COUNT)));
      case LIST_ANSWERS:
        return json(this.answers());
      default:
        return json({ error: `There is no tool called ${name}` });
    }
  }

  private facts(): Record<string, unknown> {
    const { segments, startedAt, endedAt } = this.details;
    const spokenMs = (speaker: SegmentResponse['speaker']) =>
      segments
        .filter((segment) => segment.speaker === speaker)
        .reduce((total, segment) => total + segment.durationMs, 0);

    return {
      title: this.details.title,
      profile: this.details.profile,
      language: this.details.language,
      status: this.details.status,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt?.toISOString() ?? null,
      durationSeconds: endedAt
        ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1_000)
        : null,
      speechSeconds: {
        me: Math.round(spokenMs('me') / 1_000),
        other: Math.round(spokenMs('other') / 1_000),
      },
      lines: {
        total: segments.length,
        me: segments.filter((segment) => segment.speaker === 'me').length,
        other: segments.filter((segment) => segment.speaker === 'other').length,
      },
      words: segments.reduce(
        (total, segment) => total + segment.text.split(/\s+/).filter(Boolean).length,
        0,
      ),
      answersGenerated: this.details.generations.length,
    };
  }

  private search(query: string, limit: number): Record<string, unknown> {
    if (!query) {
      return { error: 'Searching needs a word or a phrase' };
    }

    const needle = query.toLowerCase();
    const found = this.details.segments
      .map((segment, index) => ({ segment, line: index + 1 }))
      .filter(({ segment }) => segment.text.toLowerCase().includes(needle));

    return {
      matches: found.length,
      lines: found.slice(0, limit).map(({ segment, line }) => asLine(line, segment)),
    };
  }

  private read(from: number, count: number): Record<string, unknown> {
    const start = Math.max(from, 1) - 1;

    return {
      totalLines: this.details.segments.length,
      lines: this.details.segments
        .slice(start, start + count)
        .map((segment, index) => asLine(start + index + 1, segment)),
    };
  }

  private answers(): Record<string, unknown> {
    return {
      answers: this.details.generations.map((generation: GenerationResponse) => ({
        mode: generation.mode,
        createdAt: generation.createdAt.toISOString(),
        text: generation.output,
      })),
    };
  }
}

function asLine(line: number, segment: SegmentResponse): Record<string, unknown> {
  return { line, speaker: segment.speaker, text: segment.text };
}

function parse(rawArguments: string): Arguments | null {
  try {
    return rawArguments ? (JSON.parse(rawArguments) as Arguments) : {};
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function count(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

function json(value: unknown): string {
  return JSON.stringify(value);
}
