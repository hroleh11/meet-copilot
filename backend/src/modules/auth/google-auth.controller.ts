import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Env } from '~/common/config';
import { Public } from '~/common/decorators';
import { GoogleGuard } from '~/common/guards';
import { GoogleAuthService } from './google-auth.service';
import { LoginCodeService } from './login-code.service';
import type { GoogleProfile } from './types/auth.types';

type GoogleRequest = { user: GoogleProfile };

@ApiTags('auth')
@Controller('auth/google')
export class GoogleAuthController {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly loginCodeService: LoginCodeService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Get()
  @Public()
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: 'Open Google sign-in in the system browser' })
  start(): void {
    return;
  }

  @Get('callback')
  @Public()
  @UseGuards(GoogleGuard)
  @ApiExcludeEndpoint()
  async callback(@Req() req: GoogleRequest, @Res() res: Response): Promise<void> {
    const target = this.configService.getOrThrow<string>('DESKTOP_REDIRECT_URL');

    try {
      const user = await this.googleAuthService.resolveUser(req.user);
      const code = await this.loginCodeService.issue(user.id);

      res.redirect(`${target}?code=${encodeURIComponent(code)}`);
    } catch {
      res.redirect(`${target}?error=google_auth_failed`);
    }
  }
}
