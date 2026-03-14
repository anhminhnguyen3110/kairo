import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Message, AttachmentMeta } from '@/types';
import type {
  StreamingStatus,
  StreamingToolEvent,
  PendingMessage,
} from '@/features/chat/types/chat.types';

export type { StreamingStatus, StreamingToolEvent, PendingMessage };

interface ChatState {
  activeThreadId: number | null;

  fileAttachmentsByKey: Record<string, AttachmentMeta[]>;

  streamingStatus: StreamingStatus;
  streamingError: string | null;
  streamingContent: string;
  streamingToolEvents: StreamingToolEvent[];
  abortController: AbortController | null;
  streamingSessionId: string | null;

  streamingArtifactIds: string[];

  optimisticMessages: Message[];

  /** Tracks the last user-aborted session so auto-resume skips it. */
  lastAbortedSessionId: string | null;

  pendingMessage: PendingMessage | null;
  setPendingMessage: (msg: PendingMessage | null) => void;

  setActiveThread: (id: number | null) => void;
  startStream: (abortController: AbortController, optimisticMsg?: Message) => void;
  setStreamingSessionId: (id: string | null) => void;
  appendToken: (token: string) => void;
  addToolEvent: (event: StreamingToolEvent) => void;
  updateToolEvent: (id: string, output: unknown) => void;
  updateToolEventThinking: (id: string, thought: string) => void;
  appendToolInput: (id: string, partialJson: string) => void;
  addStreamingArtifactId: (id: string) => void;
  finalizeStream: () => void;
  setSavingStatus: () => void;
  abortStream: () => void;
  setStreamError: (message?: string) => void;
  addOptimisticMessage: (message: Message) => void;
  clearOptimisticMessages: () => void;
  setFileAttachments: (threadId: number, content: string, attachments: AttachmentMeta[]) => void;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    activeThreadId: null,
    pendingMessage: null,
    fileAttachmentsByKey: {},
    streamingStatus: 'idle',
    streamingError: null,
    streamingContent: '',
    streamingToolEvents: [],
    abortController: null,
    streamingSessionId: null,
    streamingArtifactIds: [],
    optimisticMessages: [],
    lastAbortedSessionId: null,

    setPendingMessage: (msg) =>
      set((state) => {
        state.pendingMessage = msg as unknown as PendingMessage;
      }),

    setActiveThread: (id) => {
      const { streamingStatus, abortController, activeThreadId } = get();
      const isChangingThread = id !== activeThreadId;

      const isNewChatToThread = activeThreadId === null && id !== null;
      if (
        isChangingThread &&
        !isNewChatToThread &&
        (streamingStatus === 'streaming' || streamingStatus === 'saving')
      ) {
        (abortController as unknown as AbortController | null)?.abort();
      }

      set((state) => {
        state.activeThreadId = id;

        if (isChangingThread && !isNewChatToThread) {
          const preserveErrorOnNewChat = id === null && state.streamingStatus === 'error';
          // True thread switch — reset all streaming state
          if (!preserveErrorOnNewChat) {
            state.streamingStatus = 'idle';
            state.streamingError = null;
          }
          state.streamingContent = '';
          state.streamingToolEvents = [];
          state.streamingArtifactIds = [];
          state.abortController = null;
          state.streamingSessionId = null;
          state.optimisticMessages = [];
        } else if (
          !isChangingThread &&
          state.streamingStatus !== 'streaming' &&
          state.streamingStatus !== 'saving' &&
          state.streamingStatus !== 'aborted'
        ) {
          state.streamingStatus = 'idle';
          state.streamingContent = '';
          state.streamingToolEvents = [];
          state.optimisticMessages = [];
        }
      });
    },

    startStream: (abortController, optimisticMsg) =>
      set((state) => {
        state.streamingStatus = 'streaming';
        state.streamingError = null;
        state.streamingContent = '';
        state.streamingToolEvents = [];
        state.streamingArtifactIds = [];
        state.optimisticMessages = optimisticMsg ? [optimisticMsg as unknown as Message] : [];
        state.abortController = abortController as unknown as AbortController;
        state.streamingSessionId = null;
      }),

    setStreamingSessionId: (id) =>
      set((state) => {
        state.streamingSessionId = id;
      }),

    appendToken: (token) =>
      set((state) => {
        state.streamingContent += token;
      }),

    addToolEvent: (event) =>
      set((state) => {
        state.streamingToolEvents.push(event);
      }),

    updateToolEvent: (id, output) =>
      set((state) => {
        const event = state.streamingToolEvents.find((e) => e.id === id);
        if (event) {
          event.output = output as Record<string, unknown>;
          event.status = 'done';
        }
      }),

    updateToolEventThinking: (id, thought) =>
      set((state) => {
        const event = state.streamingToolEvents.find((e) => e.id === id);
        if (event) {
          event.input = {
            ...event.input,
            thought: ((event.input.thought as string) ?? '') + thought,
          };
        }
      }),

    appendToolInput: (id, partialJson) =>
      set((state) => {
        const event = state.streamingToolEvents.find((e) => e.id === id);
        if (event) {
          const existing = typeof event.input.input === 'string' ? event.input.input : '';
          event.input = { input: existing + partialJson };
        }
      }),

    addStreamingArtifactId: (id) =>
      set((state) => {
        if (!state.streamingArtifactIds.includes(id)) {
          state.streamingArtifactIds.push(id);
        }
      }),

    finalizeStream: () =>
      set((state) => {
        state.streamingStatus = 'idle';
        state.streamingError = null;
        state.streamingContent = '';
        state.streamingToolEvents = [];
        state.streamingArtifactIds = [];
        state.abortController = null;
        state.streamingSessionId = null;
      }),

    setSavingStatus: () =>
      set((state) => {
        state.streamingStatus = 'saving';
        state.abortController = null;
      }),

    abortStream: () => {
      const { abortController, streamingSessionId } = get();
      // Set status BEFORE calling abort() so that any in-flight SSE error event
      // sees streamingStatus === 'aborted' and skips showing the error box.
      set((state) => {
        state.streamingStatus = 'aborted';
        // Keep streamingContent so StreamingBubble stays visible until real message loads
        // Track the aborted sessionId so the auto-resume effect ignores it.
        state.lastAbortedSessionId = streamingSessionId;
        state.abortController = null;
        state.streamingSessionId = null;
        // Immediately mark any mid-execution tool as done so the UI shows
        // "Used ..." + checkmark instead of the spinner while we wait for the
        // server-persisted message to load.
        state.streamingToolEvents = state.streamingToolEvents.map((e) =>
          e.status === 'pending' ? { ...e, status: 'done' } : e,
        );
      });
      if (abortController) {
        (abortController as unknown as AbortController).abort();
      }
    },

    setStreamError: (message) =>
      set((state) => {
        state.streamingStatus = 'error';
        state.streamingError = message ?? 'Something went wrong. Please try again.';
        state.abortController = null;
        state.streamingSessionId = null;
      }),

    addOptimisticMessage: (message) =>
      set((state) => {
        state.optimisticMessages.push(message as unknown as Message);
      }),

    clearOptimisticMessages: () =>
      set((state) => {
        state.optimisticMessages = [];
      }),

    setFileAttachments: (threadId, content, attachments) =>
      set((state) => {
        state.fileAttachmentsByKey[`${threadId}:${content}`] =
          attachments as unknown as AttachmentMeta[];
      }),
  })),
);
