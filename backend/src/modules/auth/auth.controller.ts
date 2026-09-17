import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GetCurrentUser, GetRefreshSession, Public } from '~/common/decorators';
import { MessageResponse } from '~/common/dto';
import { RtGuard } from '~/common/guards';
import type { RefreshingUser } from '~/common/types';
import { AuthService } from './auth.service';
import { ExchangeCodeDto, LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import { TokensResponse } from './dto/auth.responses';
import { LoginCodeService } from './login-code.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginCodeService: LoginCodeService,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create an account and sign in' })
  @ApiOkResponse({ type: TokensResponse })
  register(@Body() dto: RegisterDto): Promise<TokensResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: TokensResponse })
  login(@Body() dto: LoginDto): Promise<TokensResponse> {
    return this.authService.login(dto);
  }

  @Post('exchange')
  @Public()
  @ApiOperation({ summary: 'Trade a one-time login code for tokens' })
  @ApiOkResponse({ type: TokensResponse })
  exchange(@Body() dto: ExchangeCodeDto): Promise<TokensResponse> {
    return this.loginCodeService.exchange(dto.code);
  }

  @Post('refresh')
  @Public()
  @UseGuards(RtGuard)
  @ApiOperation({ summary: 'Rotate the session tokens' })
  @ApiOkResponse({ type: TokensResponse })
  refresh(
    @GetRefreshSession() session: RefreshingUser,
    @Body() dto: RefreshDto,
  ): Promise<TokensResponse> {
    return this.authService.refresh(session, dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'End the current session' })
  @ApiOkResponse({ type: MessageResponse })
  async logout(@GetCurrentUser() user: Express.User): Promise<MessageResponse> {
    await this.authService.logout(user.sid);

    return { message: 'Signed out' };
  }
}
