import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getBeUrl,
  safeJson,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  cookieOptions,
} from '@/app/api/_bff/bff-helpers';

export async function POST(request: NextRequest) {
  const body = await request.json();

  let beResponse: Response;
  try {
    beResponse = await fetch(getBeUrl('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { message: 'Service is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  const json = await safeJson<{
    data: { accessToken: string; refreshToken: string; user: unknown };
  }>(beResponse);

  if (!beResponse.ok) {
    return NextResponse.json(json ?? { message: 'Login failed' }, { status: beResponse.status });
  }

  if (!json?.data) {
    return NextResponse.json({ message: 'Unexpected response from server' }, { status: 502 });
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
