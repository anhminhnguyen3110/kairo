import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getBeUrl,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  cookieOptions,
} from '@/app/api/_bff/bff-helpers';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const beResponse = await fetch(getBeUrl('/api/v1/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const json = (await beResponse.json()) as { data: { accessToken: string; refreshToken: string } };

  if (!beResponse.ok) {
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  const { accessToken, refreshToken: newRefreshToken } = json.data;

  cookieStore.set(COOKIE_ACCESS_TOKEN, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(COOKIE_REFRESH_TOKEN, newRefreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
