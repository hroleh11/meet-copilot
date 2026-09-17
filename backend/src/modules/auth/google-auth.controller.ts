import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Env } from '~/common/config';
import { Public, UseAuthClient } from '~/common/decorators';
import { GoogleGuard } from '~/common/guards';
import { AuthService } from './auth.service';
import { CookiesService } from './cookies.service';
import { DesktopCodeStore } from './desktop-code.store';
import { GoogleAuthService } from './google-auth.service';
import type { GoogleProfile } from './types/auth.types';

type GoogleRequest = { user: GoogleProfile };

@ApiTags('auth')
@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly authService: AuthService,
    private readonly cookiesService: CookiesService,
    private readonly desktopCodeStore: DesktopCodeStore,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Get()
  @Public()
  @UseAuthClient('web')
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: 'Start Google sign-in for the web client' })
  start(): void {
    return;
  }

  @Get('desktop')
  @Public()
  @UseAuthClient('desktop')
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: 'Start Google sign-in for the desktop client' })
  startDesktop(): void {
    return;
  }

  @Get('callback')
  @Public()
  @UseGuards(GoogleGuard)
  @ApiExcludeEndpoint()
  async callback(
    @Req() req: GoogleRequest,
    @Res() res: Response,
    @Query('state') state?: string,
  ): Promise<void> {
    const forDesktop = state === 'desktop';
    const target = forDesktop
      ? this.configService.getOrThrow<string>('DESKTOP_REDIRECT_URL')
      : this.configService.getOrThrow<string>('FRONTEND_URL');

    try {
      const user = await this.googleAuthService.resolveUser(req.user);

      if (forDesktop) {
        const code = await this.desktopCodeStore.issue(user.id);
        res.redirect(`${target}?code=${encodeURIComponent(code)}`);
        return;
      }

      this.cookiesService.write(res, await this.authService.issueTokens(user, 'web'));
      res.redirect(target);
    } catch {
      res.redirect(`${target}?error=google_auth_failed`);
    }
  }
}
