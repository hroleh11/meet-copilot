import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export const GetCurrentUser = createParamDecorator(
  (_: undefined, context: ExecutionContext): Express.User => {
    const user = context.switchToHttp().getRequest<Request>().user;

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  },
);
