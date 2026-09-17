import type { Generation, Meeting, Segment } from '~/generated/prisma/client';
import type { UsageTotals } from '~/modules/usage';
import type {
  GenerationResponse,
  MeetingDetailsResponse,
  MeetingResponse,
  SegmentResponse,
} from './dto/meetings.responses';
import type { MeetingWithContent } from './meetings.repository';

export function toMeetingResponse(meeting: Meeting): MeetingResponse {
  return {
    id: meeting.id,
    profile: meeting.profile,
    language: meeting.language,
    title: meeting.title,
    status: meeting.status,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
  };
}

export function toSegmentResponse(segment: Segment): SegmentResponse {
  return {
    id: segment.id,
    speaker: segment.speaker,
    text: segment.text,
    startMs: segment.startMs,
    durationMs: segment.durationMs,
  };
}

export function toGenerationResponse(generation: Generation): GenerationResponse {
  return {
    id: generation.id,
    mode: generation.mode,
    output: generation.output,
    createdAt: generation.createdAt,
  };
}

export function toDetailsResponse(
  meeting: MeetingWithContent,
  usage: UsageTotals,
): MeetingDetailsResponse {
  return {
    ...toMeetingResponse(meeting),
    summary: meeting.summary,
    segments: meeting.segments.map(toSegmentResponse),
    generations: meeting.generations.map(toGenerationResponse),
    usage,
  };
}
