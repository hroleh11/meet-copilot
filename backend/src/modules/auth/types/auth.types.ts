export interface JwtPayload {
  sub: string;
  email: string;
  sid: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Identity {
  id: string;
  email: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}
