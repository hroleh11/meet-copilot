import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Env } from '~/common/config';
import type { JwtPayload } from '../types/auth.types';
import { accessTokenExtractor } from './token-extractors';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService<Env, true>) {
    super({
      jwtFromRequest: accessTokenExtractor,
      secretOrKey: configService.getOrThrow<string>('AT_SECRET'),
    });
  }

  validate(payload: JwtPayload): Express.User {
    return { sub: payload.sub, email: payload.email, sid: payload.sid };
  }
}
