import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { CookiesService } from './cookies.service';
import { DesktopAuthController } from './desktop-auth.controller';
import { DesktopAuthService } from './desktop-auth.service';
import { DesktopCodeStore } from './desktop-code.store';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthRepository } from './google-auth.repository';
import { GoogleAuthService } from './google-auth.service';
import { JwtTokenService } from './jwt-token.service';
import { AtStrategy } from './strategies/at.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RtStrategy } from './strategies/rt.strategy';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, GoogleAuthController, DesktopAuthController],
  providers: [
    AuthService,
    AuthRepository,
    CookiesService,
    JwtTokenService,
    GoogleAuthService,
    GoogleAuthRepository,
    DesktopAuthService,
    DesktopCodeStore,
    AtStrategy,
    RtStrategy,
    GoogleStrategy,
  ],
})
export class AuthModule {}
