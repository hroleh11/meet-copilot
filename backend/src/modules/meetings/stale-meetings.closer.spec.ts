import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Meeting } from '~/generated/prisma/client';
import { Language, MeetingProfile } from '~/generated/prisma/enums';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsRepository } from './meetings.repository';
import { StaleMeetingsCloser } from './stale-meetings.closer';

const IDLE_SECONDS = 900;

const liveMeeting = (id: string): Meeting => ({
  id,
  userId: 'owner',
  profile: MeetingProfile.daily,
  language: Language.uk,
  title: null,
  status: 'live',
  summary: null,
  overview: null,
  startedAt: new Date(Date.now() - 3_600_000),
  endedAt: null,
});

class FakeRepository {
  live: Meeting[] = [];
  finished: string[] = [];
  askedFor: Date | null = null;

  listLiveStartedBefore = (startedBefore: Date) => {
    this.askedFor = startedBefore;
    return Promise.resolve(this.live);
  };

  finish = (id: string) => {
    this.finished.push(id);
    return Promise.resolve(liveMeeting(id));
  };
}

class FakeStateStore {
  alive = new Set<string>();
  expired: string[] = [];

  isAlive = (id: string) => Promise.resolve(this.alive.has(id));
  expire = (id: string) => {
    this.expired.push(id);
    return Promise.resolve();
  };
}

async function build(): Promise<{
  closer: StaleMeetingsCloser;
  repository: FakeRepository;
  stateStore: FakeStateStore;
}> {
  const repository = new FakeRepository();
  const stateStore = new FakeStateStore();
  const moduleRef = await Test.createTestingModule({
    providers: [
      StaleMeetingsCloser,
      { provide: MeetingsRepository, useValue: repository },
      { provide: MeetingStateStore, useValue: stateStore },
      { provide: ConfigService, useValue: { getOrThrow: () => IDLE_SECONDS } },
    ],
  }).compile();

  return { closer: moduleRef.get(StaleMeetingsCloser), repository, stateStore };
}

describe('StaleMeetingsCloser', () => {
  it('leaves a meeting alone while audio still arrives', async () => {
    const { closer, repository, stateStore } = await build();
    repository.live = [liveMeeting('streaming')];
    stateStore.alive.add('streaming');

    await expect(closer.run()).resolves.toBe(0);
    expect(repository.finished).toEqual([]);
  });

  it('finishes a meeting whose app is gone and drops its live state', async () => {
    const { closer, repository, stateStore } = await build();
    repository.live = [liveMeeting('abandoned')];

    await expect(closer.run()).resolves.toBe(1);
    expect(repository.finished).toEqual(['abandoned']);
    expect(stateStore.expired).toEqual(['abandoned']);
  });

  it('never looks at meetings younger than the idle window', async () => {
    const { closer, repository } = await build();

    await closer.run();

    const asked = repository.askedFor?.getTime() ?? 0;
    expect(Date.now() - asked).toBeGreaterThanOrEqual(IDLE_SECONDS * 1_000);
  });
});
