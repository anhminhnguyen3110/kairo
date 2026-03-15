import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiClientError,
  getBffBase,
  apiClient,
  createSseStream,
  abortSseStream,
  uploadFile,
} from './api-client';

describe('getBffBase()', () => {
  it('returns empty string in a browser (window is defined)', () => {
    expect(getBffBase()).toBe('');
  });
});

describe('ApiClientError', () => {
  it('stores statusCode and message', () => {
    const err = new ApiClientError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiClientError');
  });

  it('is an instance of Error', () => {
    expect(new ApiClientError(500, 'oops')).toBeInstanceOf(Error);
  });
});

const makeFetchMock = (status: number, body?: unknown, headers?: Record<string, string>) => {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  });
};

describe('apiClient', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('GET – success', () => {
    it('calls /api/proxy path by default', async () => {
      globalThis.fetch = makeFetchMock(200, { id: 1 });
      await apiClient.get('/threads');
      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        '/api/proxy/threads',
      );
    });

    it('returns parsed JSON', async () => {
      globalThis.fetch = makeFetchMock(200, { id: 42 });
      const result = await apiClient.get<{ id: number }>('/threads/42');
      expect(result).toEqual({ id: 42 });
    });

    it('unwraps { data, meta } envelope', async () => {
      globalThis.fetch = makeFetchMock(200, {
        data: [1, 2, 3],
        meta: { timestamp: '2026-01-01T00:00:00Z' },
      });
      const result = await apiClient.get<number[]>('/items');
      expect(result).toEqual([1, 2, 3]);
    });

    it('does NOT unwrap when meta is missing', async () => {
      const payload = { data: [1], other: true };
      globalThis.fetch = makeFetchMock(200, payload);
      const result = await apiClient.get<typeof payload>('/items');
      expect(result).toEqual(payload);
    });
  });

  describe('GET – 204 No Content', () => {
    it('returns undefined for 204 responses', async () => {
      globalThis.fetch = makeFetchMock(204, undefined);
      const result = await apiClient.get('/threads/99');
      expect(result).toBeUndefined();
    });
  });

  describe('GET – error', () => {
    it('throws ApiClientError with statusCode on non-ok response', async () => {
      globalThis.fetch = makeFetchMock(404, { message: 'Thread not found' });
      await expect(apiClient.get('/threads/999')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Thread not found',
      });
    });

    it('uses fallback message when error body has no message field', async () => {
      globalThis.fetch = makeFetchMock(500, {});
      await expect(apiClient.get('/fail')).rejects.toMatchObject({
        statusCode: 500,
        message: 'Request failed: 500',
      });
    });

    it('uses fallback message when error body JSON fails to parse', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      });
      await expect(apiClient.get('/fail')).rejects.toMatchObject({
        statusCode: 503,
        message: 'Request failed: 503',
      });
    });

    it('redirects to /login?next=<path> on 401 proxy calls and still throws', async () => {
      globalThis.fetch = makeFetchMock(401, { message: 'Session expired' });
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: 'http://localhost/', pathname: '/threads', search: '' },
      });
      await expect(apiClient.get('/threads')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Session expired',
      });
      expect(window.location.href).toBe('/login?next=%2Fthreads');
      Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
    });

    it('does NOT redirect on 401 for auth (bypassProxy) calls', async () => {
      globalThis.fetch = makeFetchMock(401, { message: 'Unauthorized' });
      const originalHref = window.location.href;
      await expect(apiClient.auth.post('/api/auth/login', {})).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(window.location.href).toBe(originalHref);
    });
  });

  describe('POST', () => {
    beforeEach(() => {
      globalThis.fetch = makeFetchMock(201, { id: 10 });
    });

    it('sets method to POST', async () => {
      await apiClient.post('/threads', { title: 'hello' });
      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect(opts.method).toBe('POST');
    });

    it('serialises body as JSON', async () => {
      await apiClient.post('/threads', { title: 'hello' });
      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect(opts.body).toBe('{"title":"hello"}');
    });

    it('omits body when none is provided', async () => {
      await apiClient.post('/logout');
      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect(opts.body).toBeUndefined();
    });
  });

  describe('PATCH', () => {
    it('sets method to PATCH', async () => {
      globalThis.fetch = makeFetchMock(200, { id: 1 });
      await apiClient.patch('/threads/1', { title: 'new' });
      const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
      expect(opts.method).toBe('PATCH');
    });
  });

  describe('DELETE', () => {
    it('sets method to DELETE and returns undefined on 204', async () => {
      globalThis.fetch = makeFetchMock(204, undefined);
      const result = await apiClient.delete('/threads/1');
      expect(result).toBeUndefined();
    });
  });
});

describe('createSseStream', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns a ReadableStreamDefaultReader that yields decoded text', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: hello\n\n'));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body });

    const reader = await createSseStream(
      { message: 'hi', threadId: 1 },
      new AbortController().signal,
    );
    const { value, done } = await reader.read();
    expect(done).toBe(false);
    expect(value).toContain('data: hello');
  });

  it('throws ApiClientError when response status is not ok', async () => {
    globalThis.fetch = makeFetchMock(503, undefined);
    await expect(
      createSseStream({ message: 'hi' }, new AbortController().signal),
    ).rejects.toMatchObject({ statusCode: 503, message: 'Stream request failed' });
  });

  it('throws ApiClientError when response body is null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body: null });
    await expect(
      createSseStream({ message: 'hi' }, new AbortController().signal),
    ).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe('abortSseStream', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('POSTs to /api/proxy/chat/abort with the sessionId', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn() });
    await abortSseStream('sess-456');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain('/api/proxy/chat/abort');
    expect(JSON.parse(opts.body as string)).toEqual({ sessionId: 'sess-456' });
    expect(opts.method).toBe('POST');
  });

  it('resolves without throwing even if fetch rejects (fire-and-forget)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: vi.fn() });
    await expect(abortSseStream('sess-err')).resolves.toBeUndefined();
  });
});

describe('uploadFile', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the raw Response on success', async () => {
    const mockResponse = { ok: true, status: 200 };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);
    const result = await uploadFile(new FormData());
    expect(result).toBe(mockResponse);
  });

  it('throws ApiClientError on non-ok response', async () => {
    globalThis.fetch = makeFetchMock(413, undefined);
    await expect(uploadFile(new FormData())).rejects.toMatchObject({
      statusCode: 413,
      message: 'File upload failed',
    });
  });

  it('forwards the AbortSignal to fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const signal = new AbortController().signal;
    await uploadFile(new FormData(), signal);
    const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(opts.signal).toBe(signal);
  });

  it('calls /api/proxy/files/upload via POST with FormData as body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const fd = new FormData();
    await uploadFile(fd);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain('/api/proxy/files/upload');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(fd);
  });
});
