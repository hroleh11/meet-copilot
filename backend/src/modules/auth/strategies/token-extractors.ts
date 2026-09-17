import { ExtractJwt, type JwtFromRequestFunction } from 'passport-jwt';

export const accessTokenExtractor: JwtFromRequestFunction =
  ExtractJwt.fromAuthHeaderAsBearerToken();

export const refreshTokenExtractor: JwtFromRequestFunction =
  ExtractJwt.fromBodyField('refreshToken');
