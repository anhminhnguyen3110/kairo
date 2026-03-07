/**
 * Unit tests for file extension validation in MessageInput (fixes F12 / F13)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── heavy module mocks ───────────────────────────────────────────────────────
const mockChatState = {
  streamingStatus: 'idle',
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
    const state = { webSearchEnabled: false, toggleWebSearch: vi.fn() };
    return sel ? sel(state) : state;
  }),
}));

vi.mock('../hooks/use-stream', () => ({
  useStream: () => ({ send: vi.fn() }),
}));

vi.mock('./model-selector', () => ({
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
// ────────────────────────────────────────────────────────────────────────────

import { MessageInput } from './message-input';

function makeFile(name: string, size = 100, type = 'application/octet-stream'): File {
  return new File(['x'.repeat(size)], name, { type });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('MessageInput — file extension validation (F12 / F13)', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  function renderInput() {
    return render(<MessageInput threadId={1} />, { wrapper });
  }

  function selectFiles(input: HTMLInputElement, files: File[]) {
    Object.defineProperty(input, 'files', {
      value: files,
      configurable: true,
    });
    fireEvent.change(input);
  }

  it('accepts a valid .pdf file without showing an alert', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [makeFile('report.pdf', 500, 'application/pdf')]);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('accepts valid .txt and .md files without alerts', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [
      makeFile('notes.txt', 100, 'text/plain'),
      makeFile('readme.md', 200, 'text/markdown'),
    ]);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('rejects a .exe file with an "unsupported file type" alert (F13)', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [makeFile('malware.exe', 100, 'application/octet-stream')]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toMatch(/unsupported file type/i);
  });

  it('rejects a .py file with an "unsupported file type" alert', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [makeFile('script.py', 100, 'text/x-python')]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toMatch(/unsupported file type/i);
  });

  it('rejects an image (.png) with an "image file" alert mentioning no vision model (F12)', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [makeFile('photo.png', 200, 'image/png')]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toMatch(/image/i);
    expect(alertSpy.mock.calls[0][0]).toMatch(/vision/i);
  });

  it('rejects a .jpg image with a vision-model error message (F12)', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [makeFile('selfie.jpg', 200, 'image/jpeg')]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toMatch(/vision/i);
  });

  it('rejects a file exceeding 10 MB even if extension is valid', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const bigFile = makeFile('huge.pdf', 11 * 1024 * 1024, 'application/pdf');
    selectFiles(fileInput, [bigFile]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toMatch(/10 MB/i);
  });

  it('shows an alert for each invalid file when multiple are selected', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [
      makeFile('valid.txt', 100, 'text/plain'),
      makeFile('bad.zip', 100, 'application/zip'),
      makeFile('also-bad.exe', 100, 'application/octet-stream'),
    ]);
    // Two invalid files → two alerts
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it('includes the filename in the alert message', () => {
    const { container } = renderInput();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    selectFiles(fileInput, [makeFile('badfile.exe', 100)]);
    expect(alertSpy.mock.calls[0][0]).toContain('badfile.exe');
  });
});
