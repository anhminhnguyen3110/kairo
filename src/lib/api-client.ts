import type { ApiError } from '@/types';

const isBrowser = typeof window !== 'undefined';

export function getBffBase(): string {
  if (isBrowser) return '';
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

interface FetchOptions extends RequestInit {
  bypassProxy?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function fetchBff<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { bypassProxy = false, ...fetchOptions } = options;

  const url = bypassProxy ? `${getBffBase()}${path}` : `${getBffBase()}/api/proxy${path}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const errorBody = (await response.json()) as ApiError;
      errorMessage = errorBody.message ?? errorMessage;
    } catch {}

    if (response.status === 401 && isBrowser && !bypassProxy) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }

    throw new ApiClientError(response.status, errorMessage);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const json = (await response.json()) as unknown;

  if (
    json &&
    typeof json === 'object' &&
    'data' in (json as Record<string, unknown>) &&
    'meta' in (json as Record<string, unknown>) &&
    typeof (json as Record<string, unknown>).meta === 'object' &&
    'timestamp' in ((json as Record<string, { timestamp?: string }>).meta ?? {})
  ) {
    return (json as { data: T }).data;
  }

  return json as T;
}

export const apiClient = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return fetchBff<T>(path, { ...init, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return fetchBff<T>(path, {
      ...init,
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return fetchBff<T>(path, {
      ...init,
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return fetchBff<T>(path, { ...init, method: 'DELETE' });
  },

  auth: {
    post<T>(path: string, body?: unknown): Promise<T> {
      return fetchBff<T>(path, {
        method: 'POST',
        body: body != null ? JSON.stringify(body) : undefined,
        bypassProxy: true,
      });
    },
  },
};

export interface StreamRequestBody {
  threadId?: number;
  message: string;
  provider?: string;
  model?: string;
  fileIds?: number[];
  webSearch?: boolean;
}

export async function createSseStream(
  body: StreamRequestBody,
  signal: AbortSignal,
): Promise<ReadableStreamDefaultReader<string>> {
  const response = await fetch(`${getBffBase()}/api/proxy/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ ...body, stream: true }),
    credentials: 'include',
    signal,
  });

  if (!response.ok || !response.body) {
    throw new ApiClientError(response.status, 'Stream request failed');
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  const stream = new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(decoder.decode(value, { stream: true }));
    },
    cancel() {
      reader.cancel();
    },
  });

  return stream.getReader();
}

export async function abortSseStream(sessionId: string): Promise<void> {
  await fetch(`${getBffBase()}/api/proxy/chat/abort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    credentials: 'include',
  });
}

export async function uploadFile(formData: FormData, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(`${getBffBase()}/api/proxy/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new ApiClientError(response.status, 'File upload failed');
  }

  return response;
}
