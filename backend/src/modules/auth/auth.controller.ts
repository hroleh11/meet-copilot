import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GetCurrentUser, GetRefreshSession, Public } from '~/common/decorators';
import { MessageResponse } from '~/common/dto';
import { RtGuard } from '~/common/guards';
import type { RefreshingUser } from '~/common/types';
import { AuthService } from './auth.service';
import { CookiesService } from './cookies.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create an account and sign in' })
  @ApiOkResponse({ type: MessageResponse })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    this.cookiesService.write(res, await this.authService.register(dto, 'web'));

    return { message: 'Signed up successfully' };
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: MessageResponse })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    this.cookiesService.write(res, await this.authService.login(dto, 'web'));

    return { message: 'Signed in successfully' };
  }

  @Post('refresh')
  @Public()
  @UseGuards(RtGuard)
  @ApiOperation({ summary: 'Rotate the session tokens' })
  @ApiOkResponse({ type: MessageResponse })
  async refresh(
    @GetRefreshSession() session: RefreshingUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    const tokens = await this.authService.refresh(session, session.refreshToken);
    this.cookiesService.write(res, tokens);

    return { message: 'Tokens refreshed' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'End the current session' })
  @ApiOkResponse({ type: MessageResponse })
  async logout(
    @GetCurrentUser() user: Express.User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.authService.logout(user.sid);
    this.cookiesService.clear(res);

    return { message: 'Signed out' };
  }
}
