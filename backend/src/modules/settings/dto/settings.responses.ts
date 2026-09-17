import { ApiProperty } from '@nestjs/swagger';
import { Language, MeetingProfile } from '~/generated/prisma/enums';

export class SettingsResponse {
  @ApiProperty({ nullable: true, type: String })
  style: string | null;

  @ApiProperty({ enum: Language })
  defaultLanguage: Language;

  @ApiProperty({ enum: MeetingProfile })
  defaultProfile: MeetingProfile;
}
