export interface AuthenticatedUser {
  sub: string;
  email: string;
}

export interface AuthenticatedUserWithRefreshToken extends AuthenticatedUser {
  refreshToken: string;
}
