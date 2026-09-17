import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Language, MeetingProfile } from '~/generated/prisma/enums';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'Коротко, розмовно, без канцеляриту.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  style?: string | null;

  @ApiPropertyOptional({ enum: Language, example: Language.uk })
  @IsOptional()
  @IsEnum(Language)
  defaultLanguage?: Language;

  @ApiPropertyOptional({ enum: MeetingProfile, example: MeetingProfile.daily })
  @IsOptional()
  @IsEnum(MeetingProfile)
  defaultProfile?: MeetingProfile;
}
