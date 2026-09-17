import { Test } from '@nestjs/testing';
import type { UserSettings } from '~/generated/prisma/client';
import { Language, MeetingProfile } from '~/generated/prisma/enums';
import type { SettingsResponse } from './dto/settings.responses';
import { SettingsCache } from './settings.cache';
import { SettingsRepository } from './settings.repository';
import { SettingsService } from './settings.service';

class FakeCache {
  value: SettingsResponse | null = null;
  writes = 0;

  read = () => Promise.resolve(this.value);
  write = (_userId: string, settings: SettingsResponse) => {
    this.value = settings;
    this.writes += 1;
    return Promise.resolve();
  };
}

class FakeRepository {
  reads = 0;
  stored: UserSettings | null = null;

  findByUserId = () => {
    this.reads += 1;
    return Promise.resolve(this.stored);
  };
  upsert = (userId: string, patch: Partial<UserSettings>) => {
    this.stored = { ...(this.stored as UserSettings), ...patch };
    return Promise.resolve(this.stored);
  };
}

async function build(): Promise<{
  service: SettingsService;
  cache: FakeCache;
  repository: FakeRepository;
}> {
  const cache = new FakeCache();
  const repository = new FakeRepository();
  const moduleRef = await Test.createTestingModule({
    providers: [
      SettingsService,
      { provide: SettingsCache, useValue: cache },
      { provide: SettingsRepository, useValue: repository },
    ],
  }).compile();

  return { service: moduleRef.get(SettingsService), cache, repository };
}

describe('SettingsService', () => {
  it('falls back to defaults when the user has no stored row', async () => {
    const { service } = await build();

    await expect(service.get('user-1')).resolves.toEqual({
      style: null,
      defaultLanguage: Language.uk,
      defaultProfile: MeetingProfile.daily,
    });
  });

  it('serves a second read from the cache', async () => {
    const { service, repository } = await build();

    await service.get('user-1');
    await service.get('user-1');

    expect(repository.reads).toBe(1);
  });

  it('refreshes the cache after an update', async () => {
    const { service, cache } = await build();
    await service.get('user-1');

    const updated = await service.update('user-1', { style: 'Дуже коротко' });

    expect(updated.style).toBe('Дуже коротко');
    expect(cache.value?.style).toBe('Дуже коротко');
  });
});
