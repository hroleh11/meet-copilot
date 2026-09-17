import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthClient } from '~/generated/prisma/enums';
import { HashingService } from '~/infrastructure/hashing';
import { AuthRepository } from './auth.repository';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtTokenService } from './jwt-token.service';
import type { Identity, JwtPayload, Tokens } from './types/auth.types';

const INVALID_CREDENTIALS = 'Wrong email or password';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async register(dto: RegisterDto, client: AuthClient): Promise<Tokens> {
    const existing = await this.authRepository.findUserWithCredentialsByEmail(dto.email);

    if (existing) {
      throw new ConflictException('This email is already registered');
    }

    const user = await this.authRepository.createUser({
      email: dto.email,
      name: dto.name,
      hashedPassword: await this.hashingService.hash(dto.password),
    });

    return this.issueTokens(user, client);
  }

  async login(dto: LoginDto, client: AuthClient): Promise<Tokens> {
    const user = await this.authRepository.findUserWithCredentialsByEmail(dto.email);
    const hashedPassword = user?.credentials?.hashedPassword;

    if (!user || !hashedPassword) {
      throw new ForbiddenException(INVALID_CREDENTIALS);
    }

    if (!(await this.hashingService.compare(dto.password, hashedPassword))) {
      throw new ForbiddenException(INVALID_CREDENTIALS);
    }

    return this.issueTokens(user, client);
  }

  async issueTokens(identity: Identity, client: AuthClient): Promise<Tokens> {
    const sessionId = randomUUID();
    const tokens = await this.jwtTokenService.sign({
      sub: identity.id,
      email: identity.email,
      sid: sessionId,
    });

    await this.authRepository.createSession({
      id: sessionId,
      userId: identity.id,
      hashedRt: await this.hashingService.hash(tokens.refreshToken),
      client,
      expiresAt: this.jwtTokenService.refreshTokenExpiresAt(),
    });

    return tokens;
  }

  async refresh(payload: JwtPayload, refreshToken: string): Promise<Tokens> {
    const session = await this.authRepository.findSession(payload.sid);

    if (!session || session.userId !== payload.sub || session.expiresAt < new Date()) {
      throw new ForbiddenException('Session is no longer valid');
    }

    if (!(await this.hashingService.compare(refreshToken, session.hashedRt))) {
      await this.authRepository.deleteSession(session.id);
      throw new ForbiddenException('Session is no longer valid');
    }

    const tokens = await this.jwtTokenService.sign(payload);

    await this.authRepository.rotateSession(
      session.id,
      await this.hashingService.hash(tokens.refreshToken),
      this.jwtTokenService.refreshTokenExpiresAt(),
    );

    return tokens;
  }

  async logout(sessionId: string): Promise<void> {
    await this.authRepository.deleteSession(sessionId);
  }
}
