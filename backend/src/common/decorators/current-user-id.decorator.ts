import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): string => {
    const userId = context.switchToHttp().getRequest<Request>().user?.sub;

    if (!userId) {
      throw new UnauthorizedException();
    }

    return userId;
  },
);
