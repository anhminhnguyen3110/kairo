import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBeUrl, COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from '@/app/api/_bff/bff-helpers';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;
  const accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

  if (refreshToken) {
    try {
      await fetch(getBeUrl('/api/v1/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {}
  }

  cookieStore.delete(COOKIE_ACCESS_TOKEN);
  cookieStore.delete(COOKIE_REFRESH_TOKEN);

  return NextResponse.json({ ok: true });
}
