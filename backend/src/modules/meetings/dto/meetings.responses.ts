import { ApiProperty } from '@nestjs/swagger';
import {
  GenerationMode,
  Language,
  MeetingProfile,
  MeetingStatus,
  Speaker,
} from '~/generated/prisma/enums';

export class MeetingResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MeetingProfile })
  profile: MeetingProfile;

  @ApiProperty({ enum: Language })
  language: Language;

  @ApiProperty({ nullable: true, type: String })
  title: string | null;

  @ApiProperty({ enum: MeetingStatus })
  status: MeetingStatus;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty({ nullable: true, type: Date })
  endedAt: Date | null;
}

export class SegmentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: Speaker })
  speaker: Speaker;

  @ApiProperty()
  text: string;

  @ApiProperty()
  startMs: number;

  @ApiProperty()
  durationMs: number;
}

export class GenerationResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: GenerationMode })
  mode: GenerationMode;

  @ApiProperty()
  output: string;

  @ApiProperty()
  createdAt: Date;
}

export class UsageResponse {
  @ApiProperty()
  inputTokens: number;

  @ApiProperty()
  cacheReadTokens: number;

  @ApiProperty()
  cacheCreationTokens: number;

  @ApiProperty()
  outputTokens: number;

  @ApiProperty()
  audioSeconds: number;
}

export class MeetingDetailsResponse extends MeetingResponse {
  @ApiProperty({ nullable: true, type: String })
  summary: string | null;

  @ApiProperty({ type: [SegmentResponse] })
  segments: SegmentResponse[];

  @ApiProperty({ type: [GenerationResponse] })
  generations: GenerationResponse[];

  @ApiProperty({ type: UsageResponse })
  usage: UsageResponse;
}
