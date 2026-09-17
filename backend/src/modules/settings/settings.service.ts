import { Injectable } from '@nestjs/common';
import { Language, MeetingProfile } from '~/generated/prisma/enums';
import type { UpdateSettingsDto } from './dto/settings.dto';
import type { SettingsResponse } from './dto/settings.responses';
import { SettingsCache } from './settings.cache';
import { SettingsRepository } from './settings.repository';

const DEFAULTS: SettingsResponse = {
  style: null,
  defaultLanguage: Language.uk,
  defaultProfile: MeetingProfile.daily,
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly settingsCache: SettingsCache,
  ) {}

  async get(userId: string): Promise<SettingsResponse> {
    const cached = await this.settingsCache.read(userId);

    if (cached) {
      return cached;
    }

    const stored = await this.settingsRepository.findByUserId(userId);
    const settings = stored
      ? {
          style: stored.style,
          defaultLanguage: stored.defaultLanguage,
          defaultProfile: stored.defaultProfile,
        }
      : DEFAULTS;

    await this.settingsCache.write(userId, settings);

    return settings;
  }

  async update(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponse> {
    const stored = await this.settingsRepository.upsert(userId, dto);
    const settings: SettingsResponse = {
      style: stored.style,
      defaultLanguage: stored.defaultLanguage,
      defaultProfile: stored.defaultProfile,
    };

    await this.settingsCache.write(userId, settings);

    return settings;
  }
}
