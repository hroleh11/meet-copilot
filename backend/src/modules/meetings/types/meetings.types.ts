import type { Language, MeetingProfile } from '~/generated/prisma/enums';

export interface MeetingLiveState {
  language: Language;
  profile: MeetingProfile;
  style: string;
}
