import type { AuthenticatedUser } from './auth.types';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {
      refreshToken?: string;
    }

    interface Request {
      id: string;
      user?: User;
    }
  }
}

export {};
