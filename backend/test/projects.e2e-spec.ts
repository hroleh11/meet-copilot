import request from 'supertest';
import { AppHarness, bearer, type TestAccount } from './app-harness';

interface ProjectBody {
  id: string;
  name: string;
  meetingCount: number;
}

interface MeetingBody {
  id: string;
  projectId: string | null;
  title: string | null;
}

describe('Projects (e2e)', () => {
  let harness: AppHarness;
  let owner: TestAccount;
  let intruder: TestAccount;
  let projectId = '';
  let meetingId = '';

  const startMeeting = async (title: string): Promise<string> => {
    const response = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'interview_candidate', language: 'uk', title })
      .expect(201);

    return (response.body as MeetingBody).id;
  };

  const finishMeeting = async (id: string): Promise<void> => {
    await request(harness.server)
      .post(`/api/v1/meetings/${id}/finish`)
      .set(...bearer(owner.accessToken))
      .expect(201);
  };

  beforeAll(async () => {
    harness = await AppHarness.boot();
    owner = await harness.signUp('project-owner');
    intruder = await harness.signUp('project-intruder');
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('creates a project for the signed-in user', async () => {
    const response = await request(harness.server)
      .post('/api/v1/projects')
      .set(...bearer(owner.accessToken))
      .send({ name: 'Співбесіда в Acme' })
      .expect(201);

    projectId = (response.body as ProjectBody).id;

    expect(response.body).toMatchObject({ name: 'Співбесіда в Acme', meetingCount: 0 });
  });

  it('hides the project from everybody else', async () => {
    const theirs = await request(harness.server)
      .get('/api/v1/projects')
      .set(...bearer(intruder.accessToken))
      .expect(200);

    expect(theirs.body).toHaveLength(0);
  });

  it('moves a meeting into the project and counts it', async () => {
    meetingId = await startMeeting('Перший етап');

    const moved = await request(harness.server)
      .patch(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .send({ projectId })
      .expect(200);

    const projects = await request(harness.server)
      .get('/api/v1/projects')
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect((moved.body as MeetingBody).projectId).toBe(projectId);
    expect(projects.body).toMatchObject([{ id: projectId, meetingCount: 1 }]);
  });

  it('refuses a project that belongs to somebody else', async () => {
    const theirProject = await request(harness.server)
      .post('/api/v1/projects')
      .set(...bearer(intruder.accessToken))
      .send({ name: 'Чужий проєкт' })
      .expect(201);

    await request(harness.server)
      .patch(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .send({ projectId: (theirProject.body as ProjectBody).id })
      .expect(404);
  });

  it('renames a meeting without losing its project', async () => {
    const response = await request(harness.server)
      .patch(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .send({ title: 'Другий етап' })
      .expect(200);

    expect(response.body).toMatchObject({ title: 'Другий етап', projectId });
  });

  it('lists meetings of one project and the ones outside every project', async () => {
    const loose = await startMeeting('Без проєкту');

    const inProject = await request(harness.server)
      .get(`/api/v1/meetings?projectId=${projectId}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    const outside = await request(harness.server)
      .get('/api/v1/meetings?projectId=none')
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect((inProject.body as MeetingBody[]).map((meeting) => meeting.id)).toEqual([
      meetingId,
    ]);
    expect((outside.body as MeetingBody[]).map((meeting) => meeting.id)).toEqual([loose]);
  });

  it('takes a meeting out of its project', async () => {
    const response = await request(harness.server)
      .patch(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .send({ projectId: null })
      .expect(200);

    expect((response.body as MeetingBody).projectId).toBeNull();

    await request(harness.server)
      .patch(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .send({ projectId })
      .expect(200);
  });

  it('refuses to delete a meeting that is still running', async () => {
    await request(harness.server)
      .delete(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .expect(409);
  });

  it('refuses to delete a project while a meeting in it is running', async () => {
    await request(harness.server)
      .delete(`/api/v1/projects/${projectId}`)
      .set(...bearer(owner.accessToken))
      .expect(409);
  });

  it('deletes a finished meeting', async () => {
    const extra = await startMeeting('Зайва');
    await finishMeeting(extra);

    await request(harness.server)
      .delete(`/api/v1/meetings/${extra}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    await request(harness.server)
      .get(`/api/v1/meetings/${extra}`)
      .set(...bearer(owner.accessToken))
      .expect(404);
  });

  it('renames a project', async () => {
    const response = await request(harness.server)
      .patch(`/api/v1/projects/${projectId}`)
      .set(...bearer(owner.accessToken))
      .send({ name: 'Співбесіда в Beta' })
      .expect(200);

    expect(response.body).toMatchObject({ name: 'Співбесіда в Beta', meetingCount: 1 });
  });

  it('deletes the project together with the meetings in it', async () => {
    await finishMeeting(meetingId);

    await request(harness.server)
      .delete(`/api/v1/projects/${projectId}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    const projects = await request(harness.server)
      .get('/api/v1/projects')
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(projects.body).toHaveLength(0);

    await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .expect(404);
  });
});
