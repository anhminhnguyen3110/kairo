/**
 * Unit tests for file extension validation in MessageInput (fixes F12 / F13)
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
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

const mockSend = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-stream', () => ({
  useStream: () => ({ send: mockSend }),
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

describe('MessageInput — paste-to-file (>4000 chars)', () => {
  function renderInput() {
    return render(<MessageInput threadId={1} />, { wrapper });
  }

  function paste(textarea: HTMLTextAreaElement, text: string) {
    const preventDefault = vi.fn();
    const event = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
      clipboardData: { getData: (_: string) => text },
      preventDefault,
    });
    act(() => {
      textarea.dispatchEvent(event);
    });
    return { preventDefault };
  }

  it('short paste (≤4000 chars) does NOT call preventDefault', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    const { preventDefault } = paste(textarea, 'a'.repeat(4000));
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('long paste (>4000 chars) calls preventDefault', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    const { preventDefault } = paste(textarea, 'x'.repeat(4001));
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('long paste adds a file chip with PASTED badge', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    paste(textarea, 'x'.repeat(4001));
    expect(container.textContent).toContain('PASTED');
  });

  it('pasted file preview shows the beginning of the text content', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    const longText = 'Hello preview text ' + 'z'.repeat(4000);
    paste(textarea, longText);
    expect(container.textContent).toContain('Hello preview text');
  });

  it('exactly 4000 chars does NOT convert to file', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    paste(textarea, 'a'.repeat(4000));
    expect(container.textContent).not.toContain('PASTED');
  });

  it('4001 chars converts to file', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    paste(textarea, 'a'.repeat(4001));
    expect(container.textContent).toContain('PASTED');
  });

  it('multiple long pastes create multiple file chips', () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
    paste(textarea, 'first ' + 'a'.repeat(4001));
    paste(textarea, 'second ' + 'b'.repeat(4001));
    const badges = container.querySelectorAll('span');
    const pastedBadges = Array.from(badges).filter((el) => el.textContent === 'PASTED');
    expect(pastedBadges.length).toBe(2);
  });
});

describe('MessageInput — submit with pasted file', () => {
  beforeEach(() => {
    (mockSend as Mock).mockClear();
  });

  function renderInput() {
    return render(<MessageInput threadId={1} />, { wrapper });
  }

  function paste(textarea: HTMLTextAreaElement, text: string) {
    const event = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
      clipboardData: { getData: (_: string) => text },
      preventDefault: vi.fn(),
    });
    act(() => {
      textarea.dispatchEvent(event);
    });
  }

  it('send is called with the pasted .txt file when the message is submitted', async () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;

    // Create pasted file chip
    paste(textarea, 'Pasted content ' + 'x'.repeat(4001));

    // Set textarea to non-empty so submit guard passes
    textarea.value = 'my message';
    fireEvent.input(textarea);

    // Submit via Enter key
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });

    expect(mockSend).toHaveBeenCalledOnce();
    const args = (mockSend as Mock).mock.calls[0][0] as {
      threadId: number;
      message: string;
      files?: File[];
    };
    expect(args.threadId).toBe(1);
    expect(args.message).toBe('my message');
    expect(args.files).toHaveLength(1);
    expect(args.files![0]).toBeInstanceOf(File);
    expect(args.files![0].name).toMatch(/^pasted-text-\d+\.txt$/);
    expect(args.files![0].type).toBe('text/plain');
  });

  it('pasted file chip is removed from the UI after submit', async () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;

    paste(textarea, 'x'.repeat(4001));
    expect(container.textContent).toContain('PASTED');

    textarea.value = 'send now';
    fireEvent.input(textarea);

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });

    expect(container.textContent).not.toContain('PASTED');
  });

  it('send is NOT called when textarea is empty even if a pasted file exists', async () => {
    const { container } = renderInput();
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;

    paste(textarea, 'x'.repeat(4001));
    // Leave textarea empty
    textarea.value = '';
    fireEvent.input(textarea);

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
