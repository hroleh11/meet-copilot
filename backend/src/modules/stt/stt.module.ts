import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MeetingsModule } from '~/modules/meetings';
import { UsageModule } from '~/modules/usage';
import { SttAuthenticator } from './stt.authenticator';
import { SttServer } from './stt.server';

@Module({
  imports: [JwtModule.register({}), MeetingsModule, UsageModule],
  providers: [SttServer, SttAuthenticator],
})
export class SttModule {}
