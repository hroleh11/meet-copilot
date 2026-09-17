import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard, type IAuthModuleOptions } from '@nestjs/passport';
import type { Request } from 'express';
import { AUTH_CLIENT_KEY, type AuthClientKind } from '~/common/decorators';

@Injectable()
export class GoogleGuard extends AuthGuard('google') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override getRequest(context: ExecutionContext): Request {
    return context.switchToHttp().getRequest<Request>();
  }

  override getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const client = this.reflector.getAllAndOverride<AuthClientKind>(AUTH_CLIENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return { state: client ?? 'web' };
  }
}
