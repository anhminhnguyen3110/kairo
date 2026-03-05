import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClientError, getBffBase, apiClient } from './api-client';

// ─── getBffBase ───────────────────────────────────────────────────────────────

describe('getBffBase()', () => {
  it('returns empty string in a browser (window is defined)', () => {
    // jsdom sets window by default
    expect(getBffBase()).toBe('');
  });
});

// ─── ApiClientError ───────────────────────────────────────────────────────────

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

// ─── apiClient (fetchBff) ─────────────────────────────────────────────────────

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
      // Replace window.location with a writable mock
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: 'http://localhost/', pathname: '/threads', search: '' },
      });
      await expect(apiClient.get('/threads')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Session expired',
      });
      expect(window.location.href).toBe('/login?next=%2Fthreads');
      // Restore
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
