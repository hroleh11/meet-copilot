export const AUTH_COOKIE = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
} as const;

export const TOKEN_LIFETIME = {
  accessMinutes: 15,
  refreshDays: 15,
} as const;

export const DESKTOP_CODE_TTL_SECONDS = 60;
