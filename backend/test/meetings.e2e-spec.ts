import request from 'supertest';
import { AppHarness, bearer, type TestAccount } from './app-harness';

describe('Meetings (e2e)', () => {
  let harness: AppHarness;
  let owner: TestAccount;
  let intruder: TestAccount;
  let meetingId = '';

  beforeAll(async () => {
    harness = await AppHarness.boot();
    owner = await harness.signUp('owner');
    intruder = await harness.signUp('intruder');
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('starts a meeting for the signed-in user', async () => {
    const response = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'daily', language: 'uk', title: 'Дейлі' })
      .expect(201);

    meetingId = (response.body as { id: string }).id;

    expect(response.body).toMatchObject({
      status: 'live',
      title: 'Дейлі',
      endedAt: null,
    });
  });

  it('rejects a profile that is not one of the supported ones', async () => {
    await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'standup', language: 'uk' })
      .expect(400);
  });

  it('lists the meeting for its owner only', async () => {
    const mine = await request(harness.server)
      .get('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .expect(200);

    const theirs = await request(harness.server)
      .get('/api/v1/meetings')
      .set(...bearer(intruder.accessToken))
      .expect(200);

    expect(mine.body).toHaveLength(1);
    expect(theirs.body).toHaveLength(0);
  });

  it('answers 404 when somebody else asks for the meeting', async () => {
    await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(intruder.accessToken))
      .expect(404);
  });

  it('returns details with empty transcript and zeroed usage', async () => {
    const response = await request(harness.server)
      .get(`/api/v1/meetings/${meetingId}`)
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({
      overview: null,
      segments: [],
      generations: [],
      usage: { inputTokens: 0, outputTokens: 0, audioSeconds: 0 },
    });
  });

  it('finishes the meeting and stays idempotent', async () => {
    const first = await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/finish`)
      .set(...bearer(owner.accessToken))
      .expect(201);

    const second = await request(harness.server)
      .post(`/api/v1/meetings/${meetingId}/finish`)
      .set(...bearer(owner.accessToken))
      .expect(201);

    expect(first.body).toMatchObject({ status: 'finished' });
    expect((second.body as { endedAt: string }).endedAt).toBe(
      (first.body as { endedAt: string }).endedAt,
    );
  });

  it('stores the reply style and serves it back', async () => {
    await request(harness.server)
      .put('/api/v1/settings')
      .set(...bearer(owner.accessToken))
      .send({ style: 'Дуже коротко', defaultProfile: 'client_call' })
      .expect(200);

    const response = await request(harness.server)
      .get('/api/v1/settings')
      .set(...bearer(owner.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({
      style: 'Дуже коротко',
      defaultProfile: 'client_call',
      defaultLanguage: 'uk',
    });
  });

  /// An interview can open in Ukrainian and carry on in English, and the lanes
  /// read the language off the meeting row as they reconnect.
  it('switches the language of a meeting that is still running', async () => {
    const started = await request(harness.server)
      .post('/api/v1/meetings')
      .set(...bearer(owner.accessToken))
      .send({ profile: 'interview_candidate', language: 'uk' })
      .expect(201);

    const { id } = started.body as { id: string };

    const switched = await request(harness.server)
      .patch(`/api/v1/meetings/${id}`)
      .set(...bearer(owner.accessToken))
      .send({ language: 'en', replyLanguage: null })
      .expect(200);

    expect(switched.body).toMatchObject({ language: 'en', replyLanguage: null });

    await request(harness.server)
      .post(`/api/v1/meetings/${id}/finish`)
      .set(...bearer(owner.accessToken))
      .expect(201);

    await request(harness.server)
      .patch(`/api/v1/meetings/${id}`)
      .set(...bearer(owner.accessToken))
      .send({ language: 'ru' })
      .expect(409);
  });
});
