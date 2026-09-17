import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from '~/common/config';
import { AllExceptionsFilter } from '~/common/filters';
import { AtGuard, SubscriptionGuard } from '~/common/guards';
import { RequestIdMiddleware } from '~/common/middleware';
import { HashingModule } from '~/infrastructure/hashing';
import { PrismaModule } from '~/infrastructure/prisma';
import { RedisModule } from '~/infrastructure/redis';
import { AuthModule } from '~/modules/auth';
import { HealthModule } from '~/modules/health';
import { MeetingsModule } from '~/modules/meetings';
import { SettingsModule } from '~/modules/settings';
import { UsageModule } from '~/modules/usage';
import { UserModule } from '~/modules/user';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    HashingModule,
    AuthModule,
    UserModule,
    SettingsModule,
    UsageModule,
    MeetingsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AtGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*path}');
  }
}
