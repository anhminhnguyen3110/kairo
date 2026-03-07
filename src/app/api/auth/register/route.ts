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
  const body = (await request.json()) as { email: string; password: string };

  let registerResponse: Response;
  try {
    registerResponse = await fetch(getBeUrl('/api/v1/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { message: 'Service is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  if (!registerResponse.ok) {
    const errorData = await safeJson(registerResponse);
    return NextResponse.json(errorData ?? { message: 'Registration failed' }, {
      status: registerResponse.status,
    });
  }

  let loginResponse: Response;
  try {
    loginResponse = await fetch(getBeUrl('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json({ redirectTo: '/login' }, { status: 201 });
  }

  const loginData = await safeJson<{
    data: { accessToken: string; refreshToken: string; user: unknown };
  }>(loginResponse);

  if (!loginResponse.ok || !loginData?.data) {
    return NextResponse.json({ redirectTo: '/login' }, { status: 201 });
  }

  const { accessToken, refreshToken, user } = loginData.data;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACCESS_TOKEN, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(COOKIE_REFRESH_TOKEN, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return NextResponse.json({ user }, { status: 201 });
}
