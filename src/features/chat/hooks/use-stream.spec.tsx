import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { Message, PaginatedResponse } from '@/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mockCreateSseStream = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({
  createSseStream: mockCreateSseStream,
  ApiClientError: class ApiClientError extends Error {
    statusCode: number;
    constructor(code: number, msg: string) {
      super(msg);
      this.statusCode = code;
      this.name = 'ApiClientError';
    }
  },
}));

// Mutable shared store state — mutate per test in beforeEach
const storeState = {
  streamingContent: 'AI reply',
  optimisticMessages: [] as Message[],
  streamingToolEvents: [] as unknown[],
  streamingStatus: 'streaming' as string,
  startStream: vi.fn(),
  appendToken: vi.fn(),
  addToolEvent: vi.fn(),
  updateToolEvent: vi.fn(),
  updateToolEventThinking: vi.fn(),
  appendToolInput: vi.fn(),
  addStreamingArtifactId: vi.fn(),
  finalizeStream: vi.fn(),
  setSavingStatus: vi.fn(),
  setStreamError: vi.fn(),
  addOptimisticMessage: vi.fn(),
  clearOptimisticMessages: vi.fn(),
  setStreamingSessionId: vi.fn(),
  setFileAttachments: vi.fn(),
};

vi.mock('@/stores/chat-store', () => ({
  useChatStore: Object.assign(
    vi.fn((sel?: (s: typeof storeState) => unknown) => (sel ? sel(storeState) : storeState)),
    { getState: () => storeState },
  ),
}));

vi.mock('@/stores/model-store', () => ({
  useModelStore: vi.fn(() => ({ selection: null })),
}));

vi.mock('@/stores/ui-store', () => ({
  useUiStore: vi.fn(() => ({ webSearchEnabled: false })),
}));

vi.mock('@/stores/artifact-store', () => ({
  useArtifactStore: vi.fn(() => ({
    addArtifact: vi.fn(),
    openArtifact: vi.fn(),
    setArtifacts: vi.fn(),
  })),
}));

vi.mock('@/features/files/api/files-api', () => ({
  filesApi: { upload: vi.fn() },
}));

vi.mock('@/features/threads/hooks/use-threads', () => ({
  THREADS_QUERY_KEY: ['threads'],
}));

vi.mock('./use-messages', () => ({
  getMessagesQueryKey: (id: number) => ['threads', id, 'messages'] as const,
}));

import { useStream } from './use-stream';

function makeReader(events: object[]): ReadableStreamDefaultReader<string> {
  const lines = [...events.map((e) => `data: ${JSON.stringify(e)}\n`), 'data: [DONE]\n'];
  let i = 0;
  return {
    read: vi.fn(async () =>
      i < lines.length ? { done: false, value: lines[i++] } : { done: true, value: '' },
    ),
    cancel: vi.fn(),
    closed: Promise.resolve(undefined),
    releaseLock: vi.fn(),
  } as unknown as ReadableStreamDefaultReader<string>;
}

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    threadId: 42,
    role: 'USER',
    content: 'Hello world',
    toolCalls: null,
    metadata: null,
    orderIndex: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCacheData(messages: Message[]): InfiniteData<PaginatedResponse<Message>> {
  return {
    pages: [{ data: messages, meta: { hasMore: false } }],
    pageParams: [undefined],
  };
}

const THREAD_ID = 42;

const MESSAGE_STOP_EVENT = {
  type: 'message_stop',
  thread_id: THREAD_ID,
  message_id: 99,
};

describe('useStream — BUG-1: duplicate user message prevention', () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    storeState.streamingContent = 'AI reply';
    storeState.optimisticMessages = [makeMsg({ id: -1, content: 'Hello world', role: 'USER' })];
    storeState.streamingToolEvents = [];
    storeState.streamingStatus = 'streaming';
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }

  it('injects the optimistic user message when the cache page has no matching real message', async () => {
    mockCreateSseStream.mockResolvedValue(makeReader([MESSAGE_STOP_EVENT]));
    qc.setQueryData(['threads', THREAD_ID, 'messages'], makeCacheData([]));

    const { result } = renderHook(() => useStream(), { wrapper });
    await act(async () => {
      await result.current.send({ threadId: THREAD_ID, message: 'Hello world' });
    });

    const cache = qc.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
      'threads',
      THREAD_ID,
      'messages',
    ]);
    const userMsgs = (cache?.pages[0].data ?? []).filter((m) => m.role === 'USER');
    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].id).toBe(-1);
  });

  it('does NOT inject the optimistic message when the real user message is already in the cache (BUG-1 fix)', async () => {
    mockCreateSseStream.mockResolvedValue(makeReader([MESSAGE_STOP_EVENT]));

    const realUserMsg = makeMsg({ id: 55, content: 'Hello world', role: 'USER', orderIndex: 0 });
    qc.setQueryData(['threads', THREAD_ID, 'messages'], makeCacheData([realUserMsg]));

    const { result } = renderHook(() => useStream(), { wrapper });
    await act(async () => {
      await result.current.send({ threadId: THREAD_ID, message: 'Hello world' });
    });

    const cache = qc.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
      'threads',
      THREAD_ID,
      'messages',
    ]);
    const userMsgs = (cache?.pages[0].data ?? []).filter((m) => m.role === 'USER');

    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].id).toBe(55);
  });

  it('injects the optimistic message when cache has a different-content user message', async () => {
    mockCreateSseStream.mockResolvedValue(makeReader([MESSAGE_STOP_EVENT]));
    storeState.optimisticMessages = [makeMsg({ id: -1, content: 'My new question', role: 'USER' })];

    const olderMsg = makeMsg({ id: 7, content: 'A different question', role: 'USER' });
    qc.setQueryData(['threads', THREAD_ID, 'messages'], makeCacheData([olderMsg]));

    const { result } = renderHook(() => useStream(), { wrapper });
    await act(async () => {
      await result.current.send({ threadId: THREAD_ID, message: 'My new question' });
    });

    const cache = qc.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
      'threads',
      THREAD_ID,
      'messages',
    ]);
    const userMsgs = (cache?.pages[0].data ?? []).filter((m) => m.role === 'USER');

    expect(userMsgs).toHaveLength(2);
  });

  it('injects nothing for USER role when optimisticMessages is empty', async () => {
    mockCreateSseStream.mockResolvedValue(makeReader([MESSAGE_STOP_EVENT]));
    storeState.optimisticMessages = [];

    qc.setQueryData(['threads', THREAD_ID, 'messages'], makeCacheData([]));

    const { result } = renderHook(() => useStream(), { wrapper });
    await act(async () => {
      await result.current.send({ threadId: THREAD_ID, message: 'Hello world' });
    });

    const cache = qc.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
      'threads',
      THREAD_ID,
      'messages',
    ]);
    const userMsgs = (cache?.pages[0].data ?? []).filter((m) => m.role === 'USER');
    expect(userMsgs).toHaveLength(0);
  });

  it('injects the ASSISTANT streaming message from streamingContent into cache', async () => {
    mockCreateSseStream.mockResolvedValue(makeReader([MESSAGE_STOP_EVENT]));
    storeState.streamingContent = 'The AI answer';
    storeState.optimisticMessages = [];

    qc.setQueryData(['threads', THREAD_ID, 'messages'], makeCacheData([]));

    const { result } = renderHook(() => useStream(), { wrapper });
    await act(async () => {
      await result.current.send({ threadId: THREAD_ID, message: 'ask' });
    });

    const cache = qc.getQueryData<InfiniteData<PaginatedResponse<Message>>>([
      'threads',
      THREAD_ID,
      'messages',
    ]);
    const assistantMsgs = (cache?.pages[0].data ?? []).filter((m) => m.role === 'ASSISTANT');
    expect(assistantMsgs).toHaveLength(1);
    expect(assistantMsgs[0].content).toBe('The AI answer');
    expect(assistantMsgs[0].id).toBe(99);
  });

  it('calls finalizeStream and clearOptimisticMessages after message_stop', async () => {
    mockCreateSseStream.mockResolvedValue(makeReader([MESSAGE_STOP_EVENT]));
    qc.setQueryData(['threads', THREAD_ID, 'messages'], makeCacheData([]));

    const { result } = renderHook(() => useStream(), { wrapper });
    await act(async () => {
      await result.current.send({ threadId: THREAD_ID, message: 'Hello world' });
    });

    expect(storeState.finalizeStream).toHaveBeenCalled();
    expect(storeState.clearOptimisticMessages).toHaveBeenCalled();
  });
});
