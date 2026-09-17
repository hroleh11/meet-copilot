import { type CustomDecorator, SetMetadata } from '@nestjs/common';

export const AUTH_CLIENT_KEY = 'authClient';

export type AuthClientKind = 'web' | 'desktop';

export const UseAuthClient = (client: AuthClientKind): CustomDecorator =>
  SetMetadata(AUTH_CLIENT_KEY, client);
