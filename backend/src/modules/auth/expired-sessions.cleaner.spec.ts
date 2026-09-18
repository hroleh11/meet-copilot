import { Test } from '@nestjs/testing';
import { AuthRepository } from './auth.repository';
import { ExpiredSessionsCleaner } from './expired-sessions.cleaner';

class FakeRepository {
  cutoff: Date | null = null;
  removed = 0;

  deleteExpiredSessions = (now: Date) => {
    this.cutoff = now;
    return Promise.resolve(this.removed);
  };
}

async function build(): Promise<{
  cleaner: ExpiredSessionsCleaner;
  repository: FakeRepository;
}> {
  const repository = new FakeRepository();
  const moduleRef = await Test.createTestingModule({
    providers: [
      ExpiredSessionsCleaner,
      { provide: AuthRepository, useValue: repository },
    ],
  }).compile();

  return { cleaner: moduleRef.get(ExpiredSessionsCleaner), repository };
}

describe('ExpiredSessionsCleaner', () => {
  it('removes only sessions that expired before now', async () => {
    const { cleaner, repository } = await build();
    repository.removed = 3;

    await expect(cleaner.run()).resolves.toBe(3);
    expect(repository.cutoff?.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('says nothing when there is nothing to remove', async () => {
    const { cleaner } = await build();

    await expect(cleaner.run()).resolves.toBe(0);
  });
});
