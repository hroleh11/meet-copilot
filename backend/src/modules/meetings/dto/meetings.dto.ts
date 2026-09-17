import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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
