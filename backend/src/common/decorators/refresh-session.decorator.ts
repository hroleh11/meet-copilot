import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RefreshingUser } from '~/common/types';

export const GetRefreshSession = createParamDecorator(
  (_: undefined, context: ExecutionContext): RefreshingUser => {
    const user = context.switchToHttp().getRequest<Request>().user;

    if (!user?.refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    return { ...user, refreshToken: user.refreshToken };
  },
);
