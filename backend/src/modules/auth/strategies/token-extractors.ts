import type { Request } from 'express';
import { ExtractJwt, type JwtFromRequestFunction } from 'passport-jwt';
import { AUTH_COOKIE } from '../constants/auth.constants';

function fromCookie(name: string): JwtFromRequestFunction {
  return (req: Request) => {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;

    return cookies?.[name] ?? null;
  };
}

export const accessTokenExtractor: JwtFromRequestFunction = ExtractJwt.fromExtractors([
  fromCookie(AUTH_COOKIE.accessToken),
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]);

export const refreshTokenExtractor: JwtFromRequestFunction = ExtractJwt.fromExtractors([
  fromCookie(AUTH_COOKIE.refreshToken),
  ExtractJwt.fromBodyField('refreshToken'),
]);
