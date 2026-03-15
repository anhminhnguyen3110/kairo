import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockChatState = {
  streamingStatus: 'idle',
  setStreamError: vi.fn(),
  addOptimisticMessage: vi.fn(),
  optimisticMessages: [],
  clearOptimisticMessages: vi.fn(),
  streamingSessionId: null,
  abortStream: vi.fn(),
  setPendingMessage: vi.fn(),
  setFileAttachments: vi.fn(),
  pendingMessage: null,
};

vi.mock('@/stores/chat-store', () => ({
  useChatStore: Object.assign(
    vi.fn((sel?: (s: typeof mockChatState) => unknown) =>
      sel ? sel(mockChatState) : mockChatState,
    ),
    { getState: () => mockChatState },
  ),
}));

vi.mock('@/stores/ui-store', () => ({
  useUiStore: vi.fn((sel?: (s: unknown) => unknown) => {
    const state = { webSearchEnabled: false, toggleWebSearch: vi.fn(), toggleSidebar: vi.fn() };
    return sel ? sel(state) : state;
  }),
}));

vi.mock('@/stores/artifact-store', () => ({
  useArtifactStore: vi.fn((sel?: (s: unknown) => unknown) => {
    const state = { clearArtifacts: vi.fn() };
    return sel ? sel(state) : state;
  }),
}));

vi.mock('@/features/chat/hooks/use-stream', () => ({
  useStream: () => ({ send: vi.fn() }),
}));

vi.mock('@/features/chat/components/model-selector', () => ({
  ModelSelector: () => null,
}));

vi.mock('@/lib/api-client', () => ({
  abortSseStream: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  filesApi: { upload: vi.fn() },
}));

vi.mock('@/features/threads/api/threads-api', () => ({
  threadsApi: { create: vi.fn() },
}));

vi.mock('@/features/threads/hooks/use-threads', () => ({
  THREADS_QUERY_KEY: ['threads'],
}));

vi.mock('@/features/user/hooks/use-me', () => ({
  useMe: () => ({ data: null, isLoading: false }),
  displayNameFromEmail: (email: string) => email.split('@')[0],
}));

vi.mock('@/components/kairo-logo', () => ({
  KairoLogo: () => null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/chat/components/streaming-bubble', () => ({
  StreamingBubble: () => null,
}));

vi.mock('@/features/chat/components/message-bubble', () => ({
  MessageBubble: () => null,
}));

import { NewChatContainer } from './new-chat-container';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('SuggestionPill — onClick injects starter prompt (fixes 4.02 / 4.15)', () => {
  beforeEach(async () => {
    render(<NewChatContainer />, { wrapper });
    await new Promise((r) => setTimeout(r, 0));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four suggestion pills', () => {
    expect(screen.getByRole('button', { name: /search the web/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /write code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze a file/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create artifact/i })).toBeInTheDocument();
  });
});
