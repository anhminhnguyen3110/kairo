export const COOKIE_ACCESS_TOKEN = 'access_token';
export const COOKIE_REFRESH_TOKEN = 'refresh_token';

// Cookie maxAge should be longer than JWT expiry to allow refresh mechanism to work.
// Frontend proxy will auto-refresh expired tokens, so keep cookies alive for full session.
export const ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (match refresh token)

export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function getBeUrl(path: string): string {
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  return `${base}${path}`;
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
