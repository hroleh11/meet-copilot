import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { Env } from '~/common/config';
import type { JwtPayload } from '../types/auth.types';
import { refreshTokenExtractor } from './token-extractors';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService<Env, true>) {
    super({
      jwtFromRequest: refreshTokenExtractor,
      secretOrKey: configService.getOrThrow<string>('RT_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): Express.User {
    const refreshToken = refreshTokenExtractor(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    return { sub: payload.sub, email: payload.email, sid: payload.sid, refreshToken };
  }
}
