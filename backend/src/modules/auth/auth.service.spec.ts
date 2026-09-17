import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthSession } from '~/generated/prisma/client';
import { HashingService } from '~/infrastructure/hashing';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';

const identity = { id: 'user-1', email: 'me@example.com' };

class FakeAuthRepository {
  user: {
    id: string;
    email: string;
    credentials: { hashedPassword: string } | null;
  } | null = null;
  session: AuthSession | null = null;
  deleted: string[] = [];

  findUserWithCredentialsByEmail = () => Promise.resolve(this.user);
  createUser = () => Promise.resolve(identity);
  createSession = (data: Omit<AuthSession, 'createdAt'>) => {
    this.session = { ...data, createdAt: new Date() };
    return Promise.resolve(this.session);
  };
  findSession = () => Promise.resolve(this.session);
  rotateSession = (id: string, hashedRt: string, expiresAt: Date) => {
    this.session = { ...(this.session as AuthSession), id, hashedRt, expiresAt };
    return Promise.resolve(this.session);
  };
  deleteSession = (id: string) => {
    this.deleted.push(id);
    return Promise.resolve();
  };
}

async function build(): Promise<{
  service: AuthService;
  repository: FakeAuthRepository;
}> {
  const repository = new FakeAuthRepository();
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      HashingService,
      { provide: AuthRepository, useValue: repository },
      {
        provide: JwtTokenService,
        useValue: {
          sign: (payload: { sid: string }) =>
            Promise.resolve({
              accessToken: `at-${payload.sid}`,
              refreshToken: `rt-${payload.sid}`,
              expiresIn: 900,
            }),
          refreshTokenExpiresAt: () => new Date(Date.now() + 60_000),
        },
      },
    ],
  }).compile();

  return { service: moduleRef.get(AuthService), repository };
}

describe('AuthService', () => {
  it('refuses to register an email that already exists', async () => {
    const { service, repository } = await build();
    repository.user = { ...identity, credentials: { hashedPassword: 'x' } };

    await expect(
      service.register(
        { email: identity.email, name: 'Me', password: 'password1' },
        'web',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('gives the same error for an unknown email and a wrong password', async () => {
    const { service, repository } = await build();
    const hashing = new HashingService();
    repository.user = null;

    const unknownEmail = await service
      .login({ email: 'nobody@example.com', password: 'password1' }, 'web')
      .catch((error: Error) => error.message);

    repository.user = {
      ...identity,
      credentials: { hashedPassword: await hashing.hash('password1') },
    };

    const wrongPassword = await service
      .login({ email: identity.email, password: 'password2' }, 'web')
      .catch((error: Error) => error.message);

    expect(unknownEmail).toBe(wrongPassword);
  });

  it('stores a hashed refresh token rather than the token itself', async () => {
    const { service, repository } = await build();

    const tokens = await service.issueTokens(identity, 'desktop');

    expect(repository.session?.hashedRt).not.toBe(tokens.refreshToken);
    expect(repository.session?.client).toBe('desktop');
  });

  it('drops the session when a stale refresh token is replayed', async () => {
    const { service, repository } = await build();
    const tokens = await service.issueTokens(identity, 'web');
    const session = repository.session as AuthSession;

    await expect(
      service.refresh(
        { sub: identity.id, email: identity.email, sid: session.id },
        `${tokens.refreshToken}-stale`,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.deleted).toContain(session.id);
  });

  it('rotates the stored token on a valid refresh', async () => {
    const { service, repository } = await build();
    const tokens = await service.issueTokens(identity, 'web');
    const session = repository.session as AuthSession;
    const previousHash = session.hashedRt;

    await service.refresh(
      { sub: identity.id, email: identity.email, sid: session.id },
      tokens.refreshToken,
    );

    expect(repository.session?.hashedRt).not.toBe(previousHash);
    expect(repository.deleted).toHaveLength(0);
  });
});
