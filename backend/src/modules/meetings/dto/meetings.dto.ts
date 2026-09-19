import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Language, MeetingProfile } from '~/generated/prisma/enums';

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
}
