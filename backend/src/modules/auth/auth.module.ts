import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthRepository } from './google-auth.repository';
import { GoogleAuthService } from './google-auth.service';
import { JwtTokenService } from './jwt-token.service';
import { LoginCodeService } from './login-code.service';
import { LoginCodeStore } from './login-code.store';
import { AtStrategy } from './strategies/at.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RtStrategy } from './strategies/rt.strategy';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, GoogleAuthController],
  providers: [
    AuthService,
    AuthRepository,
    JwtTokenService,
    GoogleAuthService,
    GoogleAuthRepository,
    LoginCodeService,
    LoginCodeStore,
    AtStrategy,
    RtStrategy,
    GoogleStrategy,
  ],
})
export class AuthModule {}
