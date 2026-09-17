export interface AuthenticatedUser {
  sub: string;
  email: string;
  sid: string;
}

export interface RefreshingUser extends AuthenticatedUser {
  refreshToken: string;
}
