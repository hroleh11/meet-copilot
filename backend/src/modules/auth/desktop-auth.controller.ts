import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetRefreshSession, Public } from '~/common/decorators';
import { RtGuard } from '~/common/guards';
import type { RefreshingUser } from '~/common/types';
import { AuthService } from './auth.service';
import { DesktopAuthService } from './desktop-auth.service';
import { TokensResponse } from './dto/auth.responses';
import { DesktopRefreshDto, ExchangeCodeDto } from './dto/desktop-auth.dto';

@ApiTags('auth')
@Controller('auth/desktop')
export class DesktopAuthController {
  constructor(
    private readonly desktopAuthService: DesktopAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post('exchange')
  @Public()
  @ApiOperation({ summary: 'Trade a one-time login code for tokens' })
  @ApiOkResponse({ type: TokensResponse })
  exchange(@Body() dto: ExchangeCodeDto): Promise<TokensResponse> {
    return this.desktopAuthService.exchangeCode(dto.code);
  }

  @Post('refresh')
  @Public()
  @UseGuards(RtGuard)
  @ApiOperation({ summary: 'Rotate desktop tokens' })
  @ApiOkResponse({ type: TokensResponse })
  refresh(
    @GetRefreshSession() session: RefreshingUser,
    @Body() dto: DesktopRefreshDto,
  ): Promise<TokensResponse> {
    return this.authService.refresh(session, dto.refreshToken);
  }
}
