import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-google-oauth20';
import type { Env } from '~/common/config';
import type { GoogleProfile } from '../types/auth.types';

type GoogleDoneCallback = (error: Error | null, profile?: GoogleProfile | false) => void;

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService<Env, true>) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: GoogleDoneCallback,
  ): void {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('Google account has no email'));
      return;
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName || email,
    };

    done(null, googleProfile);
  }
}
