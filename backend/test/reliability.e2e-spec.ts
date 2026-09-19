import request from 'supertest';
import { ExpiredSessionsCleaner } from '~/modules/auth';
import { MeetingStateStore, StaleMeetingsCloser } from '~/modules/meetings';
import { AppHarness, bearer, type TestAccount } from './app-harness';

const HOUR_MS = 60 * 60 * 1000;

describe('Reliability (e2e)', () => {
  let harness: AppHarness;
  let owner: TestAccount;

  beforeAll(async () => {
    harness = await AppHarness.boot();
    owner = await harness.signUp('reliability');
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  const startMeeting = async (): Promise<string> => {
    const response = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'daily', language: 'uk' })
      .expect(201);

    return (response.body as { id: string }).id;
  };

  const backdate = (meetingId: string): Promise<unknown> =>
    harness.prisma.meeting.update({
      where: { id: meetingId },
      data: { startedAt: new Date(Date.now() - 6 * HOUR_MS) },
    });

  it('refuses a request body larger than the limit', async () => {
    const response = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'daily', language: 'uk', title: 'т'.repeat(700_000) })
      .expect(413);

    expect(response.body).toMatchObject({ statusCode: 413 });
  });

  it('finishes a meeting whose app stopped streaming', async () => {
    const meetingId = await startMeeting();
    await backdate(meetingId);

    await harness.app.get(StaleMeetingsCloser).run();

    const response = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({ status: 'finished' });
  });

  it('leaves a meeting running while its audio still arrives', async () => {
    const meetingId = await startMeeting();
    await backdate(meetingId);
    await harness.app.get(MeetingStateStore).touchAlive(meetingId);

    await harness.app.get(StaleMeetingsCloser).run();

    const response = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({ status: 'live' });
  });

  it('removes a session that outlived its refresh token', async () => {
    const guest = await harness.signUp('expired');

    await harness.prisma.authSession.updateMany({
      where: { user: { email: guest.email } },
      data: { expiresAt: new Date(Date.now() - HOUR_MS) },
    });

    const removed = await harness.app.get(ExpiredSessionsCleaner).run();
    expect(removed).toBeGreaterThan(0);

    await request(harness.server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: guest.refreshToken })
      .expect(403);
  });
});
