import { Injectable } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { GoogleAuthRepository } from './google-auth.repository';
import type { GoogleProfile, Identity } from './types/auth.types';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly googleAuthRepository: GoogleAuthRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async resolveUser(profile: GoogleProfile): Promise<Identity> {
    const byGoogleId = await this.googleAuthRepository.findUserByGoogleId(
      profile.googleId,
    );

    if (byGoogleId) {
      return byGoogleId;
    }

    const byEmail = await this.authRepository.findUserWithCredentialsByEmail(
      profile.email,
    );

    if (byEmail) {
      await this.googleAuthRepository.linkGoogleId(byEmail.id, profile.googleId);
      return byEmail;
    }

    return this.authRepository.createUser({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
    });
  }
}
