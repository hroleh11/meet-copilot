import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { Env } from '~/common/config';
import { AUTH_COOKIE, TOKEN_LIFETIME } from './constants/auth.constants';
import type { Tokens } from './types/auth.types';

@Injectable()
export class CookiesService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  write(res: Response, tokens: Tokens): void {
    res.cookie(AUTH_COOKIE.accessToken, tokens.accessToken, {
      ...this.options(),
      maxAge: TOKEN_LIFETIME.accessMinutes * 60 * 1000,
    });

    res.cookie(AUTH_COOKIE.refreshToken, tokens.refreshToken, {
      ...this.options(),
      path: this.refreshPath(),
      maxAge: TOKEN_LIFETIME.refreshDays * 24 * 60 * 60 * 1000,
    });
  }

  clear(res: Response): void {
    res.clearCookie(AUTH_COOKIE.accessToken, this.options());
    res.clearCookie(AUTH_COOKIE.refreshToken, {
      ...this.options(),
      path: this.refreshPath(),
    });
  }

  private options(): CookieOptions {
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    const isProduction =
      this.configService.getOrThrow<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      ...(isProduction && domain ? { domain: `.${domain}` } : {}),
    };
  }

  private refreshPath(): string {
    const prefix = this.configService.getOrThrow<string>('API_PREFIX');

    return `/${prefix.replace(/^\/+|\/+$/g, '')}/auth/refresh`;
  }
}
