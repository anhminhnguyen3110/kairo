import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getBeUrl,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  cookieOptions,
} from '@/app/api/_bff/bff-helpers';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const beResponse = await fetch(getBeUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await beResponse.json()) as {
    data: { accessToken: string; refreshToken: string; user: unknown };
  };

  if (!beResponse.ok) {
    return NextResponse.json(json, { status: beResponse.status });
  }

  const { accessToken, refreshToken, user } = json.data;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACCESS_TOKEN, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(COOKIE_REFRESH_TOKEN, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return NextResponse.json({ user }, { status: 200 });
}
