import { Injectable } from '@nestjs/common';
import type { UserSettings } from '~/generated/prisma/client';
import type { Language, MeetingProfile } from '~/generated/prisma/enums';
import { PrismaService } from '~/infrastructure/prisma';

export interface SettingsPatch {
  style?: string | null;
  defaultLanguage?: Language;
  defaultProfile?: MeetingProfile;
}

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }

  upsert(userId: string, patch: SettingsPatch): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
    });
  }
}
