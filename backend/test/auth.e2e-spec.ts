import request from 'supertest';
import { AppHarness, bearer, type TestAccount } from './app-harness';

describe('Auth (e2e)', () => {
  let harness: AppHarness;
  let account: TestAccount;

  beforeAll(async () => {
    harness = await AppHarness.boot();
    account = await harness.signUp('auth');
  });

  afterAll(async () => {
    await harness.shutdown();
  });

  it('hands out a token pair on registration', () => {
    expect(account.accessToken).toBeTruthy();
    expect(account.refreshToken).toBeTruthy();
  });

  it('rejects a weak password before it reaches the service', async () => {
    await request(harness.server)
      .post('/api/v1/auth/register')
      .send({ email: `weak-${account.email}`, name: 'Weak', password: 'short' })
      .expect(400);
  });

  it('returns the profile for a valid bearer token', async () => {
    const response = await request(harness.server)
      .get('/api/v1/users/me')
      .set(...bearer(account.accessToken))
      .expect(200);

    expect(response.body).toMatchObject({ email: account.email });
  });

  it('refuses the profile without a token', async () => {
    await request(harness.server).get('/api/v1/users/me').expect(401);
  });

  it('answers the same way for an unknown email and a wrong password', async () => {
    const unknown = await request(harness.server)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'password1' })
      .expect(403);

    const wrong = await request(harness.server)
      .post('/api/v1/auth/login')
      .send({ email: account.email, password: 'password2' })
      .expect(403);

    expect(unknown.body).toMatchObject({
      message: (wrong.body as { message: string }).message,
    });
  });

  it('rotates tokens and refuses the replayed refresh token', async () => {
    const rotated = await request(harness.server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: account.refreshToken })
      .expect(201);

    expect((rotated.body as { accessToken: string }).accessToken).toBeTruthy();

    await request(harness.server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: account.refreshToken })
      .expect(403);
  });

  it('refuses an unknown login code', async () => {
    await request(harness.server)
      .post('/api/v1/auth/exchange')
      .send({ code: 'not-a-real-code' })
      .expect(401);
  });
});
