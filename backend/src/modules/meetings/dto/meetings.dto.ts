import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Language, MeetingProfile } from '~/generated/prisma/enums';

export const MEETINGS_OUTSIDE_PROJECTS = 'none';

const UUID_OR_NONE =
  /^(none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export class CreateMeetingDto {
  @ApiProperty({ enum: MeetingProfile, example: MeetingProfile.daily })
  @IsEnum(MeetingProfile)
  profile: MeetingProfile;

  @ApiProperty({ enum: Language, example: Language.uk })
  @IsEnum(Language)
  language: Language;

  @ApiPropertyOptional({ example: 'Дейлі з командою' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Project the meeting belongs to; its materials join the context',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Materials uploaded for this meeting before it started',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  resourceIds?: string[];
}

export class UpdateMeetingDto {
  @ApiPropertyOptional({ example: 'Другий етап співбесіди' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Project to move the meeting into, or null to take it out of one',
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  projectId?: string | null;
}

export class ListMeetingsDto {
  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Id of the last meeting already on screen; the page starts after it',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    description: `Meetings of one project, or "${MEETINGS_OUTSIDE_PROJECTS}" for the ones in no project at all`,
  })
  @IsOptional()
  @Matches(UUID_OR_NONE)
  projectId?: string;
}
