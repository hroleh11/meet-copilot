import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Meeting } from '~/generated/prisma/client';
import { Language, MeetingProfile } from '~/generated/prisma/enums';
import { ProjectsService } from '~/modules/projects';
import { ResourcesService } from '~/modules/resources';
import { SettingsService } from '~/modules/settings';
import { UsageRepository } from '~/modules/usage';
import { MeetingOverviewWriter } from './meeting-overview.writer';
import { MeetingStateStore } from './meeting-state.store';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';
import type { MeetingLiveState } from './types/meetings.types';

const meeting: Meeting = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'owner',
  projectId: null,
  profile: MeetingProfile.daily,
  language: Language.uk,
  title: null,
  status: 'live',
  summary: null,
  overview: null,
  contextBrief: null,
  startedAt: new Date(),
  endedAt: null,
};

class FakeRepository {
  stored: Meeting = { ...meeting };
  finishCalls = 0;
  deleted: string[] = [];

  create = () => Promise.resolve(this.stored);
  findOwned = (userId: string) =>
    Promise.resolve(userId === this.stored.userId ? this.stored : null);
  finish = () => {
    this.finishCalls += 1;
    this.stored = { ...this.stored, status: 'finished', endedAt: new Date() };
    return Promise.resolve(this.stored);
  };
  update = (_id: string, data: Partial<Meeting>) => {
    this.stored = { ...this.stored, ...data };
    return Promise.resolve(this.stored);
  };
  delete = (id: string) => {
    this.deleted.push(id);
    return Promise.resolve();
  };
}

class FakeProjects {
  asked: string[] = [];

  requireOwned = (userId: string, projectId: string) => {
    this.asked.push(projectId);

    if (userId !== 'owner') {
      return Promise.reject(new NotFoundException('Project not found'));
    }

    return Promise.resolve({ id: projectId });
  };
}

class FakeResources {
  claimed: { meetingId: string; resourceIds: string[] }[] = [];
  brief: string | null = null;

  claimForMeeting = (_userId: string, meetingId: string, resourceIds: string[]) => {
    this.claimed.push({ meetingId, resourceIds });
    return Promise.resolve();
  };
  briefFor = () => Promise.resolve(this.brief);
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
  projects: FakeProjects;
  resources: FakeResources;
}> {
  const repository = new FakeRepository();
  const stateStore = new FakeStateStore();
  const projects = new FakeProjects();
  const resources = new FakeResources();
  const moduleRef = await Test.createTestingModule({
    providers: [
      MeetingsService,
      { provide: MeetingsRepository, useValue: repository },
      { provide: MeetingStateStore, useValue: stateStore },
      {
        provide: MeetingOverviewWriter,
        useValue: {
          prepare: () => Promise.resolve(),
          ensure: () => Promise.resolve(null),
        },
      },
      { provide: ProjectsService, useValue: projects },
      { provide: ResourcesService, useValue: resources },
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

  return {
    service: moduleRef.get(MeetingsService),
    repository,
    stateStore,
    projects,
    resources,
  };
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
      contextBrief: '',
      today: meeting.startedAt.toISOString().slice(0, 10),
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

  it('checks the project belongs to the same user before moving a meeting in', async () => {
    const { service, projects } = await build();

    await service.update('owner', meeting.id, {
      projectId: '22222222-2222-4222-8222-222222222222',
    });

    expect(projects.asked).toEqual(['22222222-2222-4222-8222-222222222222']);
  });

  it('takes a meeting out of its project without asking about a project', async () => {
    const { service, projects, repository } = await build();

    const updated = await service.update('owner', meeting.id, { projectId: null });

    expect(projects.asked).toEqual([]);
    expect(repository.stored.projectId).toBeNull();
    expect(updated.projectId).toBeNull();
  });

  it('renames a meeting without touching its project', async () => {
    const { service, repository } = await build();

    repository.stored = { ...repository.stored, projectId: 'kept' };

    const updated = await service.update('owner', meeting.id, {
      title: '  Другий етап  ',
    });

    expect(updated.title).toBe('Другий етап');
    expect(repository.stored.projectId).toBe('kept');
  });

  it('refuses to delete a meeting that is still running', async () => {
    const { service, repository } = await build();

    await expect(service.remove('owner', meeting.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.deleted).toEqual([]);
  });

  it('deletes a finished meeting', async () => {
    const { service, repository } = await build();

    await service.finish('owner', meeting.id);
    await service.remove('owner', meeting.id);

    expect(repository.deleted).toEqual([meeting.id]);
  });

  it('treats finishing twice as a no-op', async () => {
    const { service, repository } = await build();

    await service.finish('owner', meeting.id);
    const second = await service.finish('owner', meeting.id);

    expect(repository.finishCalls).toBe(1);
    expect(second.status).toBe('finished');
  });
});
