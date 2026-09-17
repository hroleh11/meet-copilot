import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '~/common/config';
import { TOKEN_LIFETIME } from './constants/auth.constants';
import type { JwtPayload, Tokens } from './types/auth.types';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async sign(payload: JwtPayload): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('AT_SECRET'),
        expiresIn: `${TOKEN_LIFETIME.accessMinutes}m`,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('RT_SECRET'),
        expiresIn: `${TOKEN_LIFETIME.refreshDays}d`,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_LIFETIME.accessMinutes * 60,
    };
  }

  refreshTokenExpiresAt(): Date {
    return new Date(Date.now() + TOKEN_LIFETIME.refreshDays * 24 * 60 * 60 * 1000);
  }
}
