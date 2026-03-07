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

type RouteContext = { params: Promise<{ path: string[] }> };

async function refreshTokens(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH_TOKEN)?.value;

  if (!refreshToken) return null;

  let response: Response;
  try {
    response = await fetch(getBeUrl('/api/v1/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return null;
  }

  const data = await safeJson<{ data: { accessToken: string; refreshToken: string } }>(response);

  if (!data?.data) {
    cookieStore.delete(COOKIE_ACCESS_TOKEN);
    cookieStore.delete(COOKIE_REFRESH_TOKEN);
    return null;
  }

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
  /** Pre-buffered body text. When provided, used instead of request.body so the
   *  same payload can be re-sent on a 401 refresh-retry without draining the
   *  original ReadableStream twice. */
  bufferedBody?: string | null,
  /** AbortSignal propagated from the incoming request. When the browser
   *  disconnects, this signal fires, which aborts the BFF→BE fetch and closes
   *  the NestJS TCP connection so req.on('close') fires and SSE slots are
   *  released. NOT passed on 401-retry calls to avoid aborting a healthy
   *  re-connection. */
  signal?: AbortSignal | null,
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
    if (isMultipart) {
      init.body = await request.formData();
    } else if (bufferedBody !== undefined && bufferedBody !== null) {
      // Use pre-buffered string — safe to re-use for retries.
      init.body = bufferedBody;
    } else {
      // Streaming body (only used on the very first attempt, not retries).
      init.body = request.body;
      (init as RequestInit & { duplex?: string }).duplex = 'half';
    }
  }

  if (signal) init.signal = signal;

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

  // For non-GET/HEAD requests with a non-multipart body, buffer the body text
  // so it can be safely re-sent on a 401 refresh-retry.
  // (Streaming ReadableStream bodies can only be consumed once; a pre-read
  // string can be passed to both the first attempt and any retry.)
  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');
  const needsBodyBuffer =
    !['GET', 'HEAD'].includes(request.method) && !isMultipart && request.body !== null;
  const bufferedBody = needsBodyBuffer ? await request.text() : null;

  // Pass request.signal so that if the browser disconnects while the SSE
  // stream is open, the BFF→BE fetch is also aborted, closing the NestJS
  // connection and allowing releaseSseSlot() to run in the finally block.
  const requestSignal = request.signal ?? null;

  let beResponse: Response;
  try {
    beResponse = await forwardToBe(request, beUrl, accessToken, bufferedBody, requestSignal);
  } catch (err) {
    // If the client aborted (browser disconnect), propagate as-is — no need
    // to return a 503 since the client is already gone.
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    return NextResponse.json(
      { message: 'Service is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  if (beResponse.status === 401) {
    const newToken = await refreshTokens();
    if (!newToken) {
      return NextResponse.json({ message: 'Session expired' }, { status: 401 });
    }
    accessToken = newToken;

    try {
      // Pass the same bufferedBody so the retry doesn't attempt to re-read
      // an already-consumed ReadableStream.
      // Note: do NOT pass requestSignal on retry — a new healthy connection
      // should not be pre-aborted by a stale signal.
      beResponse = await forwardToBe(request, beUrl, accessToken, bufferedBody);
    } catch {
      return NextResponse.json(
        { message: 'Service is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }
  }

  const isSSE = beResponse.headers.get('content-type')?.includes('text/event-stream') ?? false;

  if (isSSE && beResponse.body) {
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
