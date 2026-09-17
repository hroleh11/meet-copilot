import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { DesktopCodeStore } from './desktop-code.store';
import type { Tokens } from './types/auth.types';

@Injectable()
export class DesktopAuthService {
  constructor(
    private readonly desktopCodeStore: DesktopCodeStore,
    private readonly authRepository: AuthRepository,
    private readonly authService: AuthService,
  ) {}

  async exchangeCode(code: string): Promise<Tokens> {
    const userId = await this.desktopCodeStore.consume(code);

    if (!userId) {
      throw new UnauthorizedException('Login code is invalid or expired');
    }

    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Login code is invalid or expired');
    }

    return this.authService.issueTokens(user, 'desktop');
  }
}
