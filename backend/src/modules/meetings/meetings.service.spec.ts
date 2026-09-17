import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Meeting } from '~/generated/prisma/client';
import { Language, MeetingProfile } from '~/generated/prisma/enums';
import { SettingsService } from '~/modules/settings';
import { UsageRepository } from '~/modules/usage';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';
import type { MeetingLiveState } from './types/meetings.types';

const meeting: Meeting = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'owner',
  profile: MeetingProfile.daily,
  language: Language.uk,
  title: null,
  status: 'live',
  summary: null,
  startedAt: new Date(),
  endedAt: null,
};

class FakeRepository {
  stored: Meeting = { ...meeting };
  finishCalls = 0;

  create = () => Promise.resolve(this.stored);
  findOwned = (userId: string) =>
    Promise.resolve(userId === this.stored.userId ? this.stored : null);
  finish = () => {
    this.finishCalls += 1;
    this.stored = { ...this.stored, status: 'finished', endedAt: new Date() };
    return Promise.resolve(this.stored);
  };
}

class FakeStateStore {
  state: MeetingLiveState | null = null;
  expired: string[] = [];

  initialize = (_id: string, state: MeetingLiveState) => {
    this.state = state;
    return Promise.resolve();
  };
  expire = (id: string) => {
    this.expired.push(id);
    return Promise.resolve();
  };
}

async function build(): Promise<{
  service: MeetingsService;
  repository: FakeRepository;
  stateStore: FakeStateStore;
}> {
  const repository = new FakeRepository();
  const stateStore = new FakeStateStore();
  const moduleRef = await Test.createTestingModule({
    providers: [
      MeetingsService,
      { provide: MeetingsRepository, useValue: repository },
      { provide: MeetingStateStore, useValue: stateStore },
      {
        provide: SettingsService,
        useValue: {
          get: () =>
            Promise.resolve({
              style: 'Коротко',
              defaultLanguage: Language.uk,
              defaultProfile: MeetingProfile.daily,
            }),
        },
      },
      {
        provide: UsageRepository,
        useValue: { totalsForMeeting: () => Promise.resolve({}) },
      },
    ],
  }).compile();

  return { service: moduleRef.get(MeetingsService), repository, stateStore };
}

describe('MeetingsService', () => {
  it('freezes the current style into the live state at start', async () => {
    const { service, stateStore } = await build();

    await service.create('owner', {
      profile: MeetingProfile.daily,
      language: Language.uk,
    });

    expect(stateStore.state).toEqual({
      language: Language.uk,
      profile: MeetingProfile.daily,
      style: 'Коротко',
    });
  });

  it('hides a meeting that belongs to somebody else', async () => {
    const { service } = await build();

    await expect(service.finish('intruder', meeting.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('expires the live state once the meeting is finished', async () => {
    const { service, stateStore } = await build();

    await service.finish('owner', meeting.id);

    expect(stateStore.expired).toEqual([meeting.id]);
  });

  it('treats finishing twice as a no-op', async () => {
    const { service, repository } = await build();

    await service.finish('owner', meeting.id);
    const second = await service.finish('owner', meeting.id);

    expect(repository.finishCalls).toBe(1);
    expect(second.status).toBe('finished');
  });
});
