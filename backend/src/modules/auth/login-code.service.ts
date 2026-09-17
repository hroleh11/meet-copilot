import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { LoginCodeStore } from './login-code.store';
import type { Tokens } from './types/auth.types';

@Injectable()
export class LoginCodeService {
  constructor(
    private readonly loginCodeStore: LoginCodeStore,
    private readonly authRepository: AuthRepository,
    private readonly authService: AuthService,
  ) {}

  issue(userId: string): Promise<string> {
    return this.loginCodeStore.issue(userId);
  }

  async exchange(code: string): Promise<Tokens> {
    const userId = await this.loginCodeStore.consume(code);
    const user = userId ? await this.authRepository.findUserById(userId) : null;

    if (!user) {
      throw new UnauthorizedException('Login code is invalid or expired');
    }

    return this.authService.issueTokens(user);
  }
}
