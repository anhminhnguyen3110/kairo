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

type RouteContext = { params: Promise<{ path: string[] }> };

async function refreshTokens(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  if (!refreshToken) return null;

  const response = await fetch(getBeUrl('/api/v1/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return null;
  }

  const data = (await response.json()) as { data: { accessToken: string; refreshToken: string } };

  cookieStore.set(COOKIE_ACCESS_TOKEN, data.data.accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(COOKIE_REFRESH_TOKEN, data.data.refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return data.data.accessToken;
}

async function forwardToBe(
  request: NextRequest | Request,
  beUrl: string,
  accessToken: string,
): Promise<Response> {
  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (!isMultipart) {
    headers['Content-Type'] = contentType || 'application/json';
  }

  const accept = request.headers.get('accept');
  if (accept) headers['Accept'] = accept;

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = isMultipart ? await request.formData() : request.body;

    (init as RequestInit & { duplex?: string }).duplex = 'half';
  }

  return fetch(beUrl, init as RequestInit);
}

async function handleRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse | Response> {
  const { path } = await context.params;
  const apiPath = path.join('/');

  const searchParams = request.nextUrl.searchParams.toString();
  const beUrl = getBeUrl(`/api/v1/${apiPath}${searchParams ? `?${searchParams}` : ''}`);

  const cookieStore = await cookies();
  let accessToken = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

  if (!accessToken) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    accessToken = refreshed;
  }

  let beResponse = await forwardToBe(request, beUrl, accessToken);

  if (beResponse.status === 401) {
    const newToken = await refreshTokens();
    if (!newToken) {
      return NextResponse.json({ message: 'Session expired' }, { status: 401 });
    }
    accessToken = newToken;

    beResponse = await forwardToBe(request.clone(), beUrl, accessToken);
  }

  const isSSE = beResponse.headers.get('content-type')?.includes('text/event-stream') ?? false;

  if (isSSE && beResponse.body) {
    // Always use 200 for SSE responses regardless of the upstream status code.
    // The upstream may return 201 (new thread created) or 202 (existing thread),
    // but streaming a non-200 body through Next.js Route Handlers causes the
    // connection to be closed prematurely (ERR_INCOMPLETE_CHUNKED_ENCODING).
    // Thread creation is communicated via SSE `meta` / `message_start` events.
    return new Response(beResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const responseBody = beResponse.status !== 204 ? await beResponse.text() : null;

  const headers = new Headers();
  const forwardHeaders = ['content-type', 'x-request-id'];
  for (const header of forwardHeaders) {
    const value = beResponse.headers.get(header);
    if (value) headers.set(header, value);
  }

  return new NextResponse(responseBody, {
    status: beResponse.status,
    headers,
  });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handleRequest(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return handleRequest(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handleRequest(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handleRequest(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleRequest(req, ctx);
}
