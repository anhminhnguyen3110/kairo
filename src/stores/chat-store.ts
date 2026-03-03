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

  /** artifact IDs (temp UUID) emitted via SSE `artifact` event during the live stream */
  streamingArtifactIds: string[];

  optimisticMessages: Message[];

  pendingMessage: PendingMessage | null;
  setPendingMessage: (msg: PendingMessage | null) => void;

  setActiveThread: (id: number | null) => void;
  startStream: (abortController: AbortController) => void;
  setStreamingSessionId: (id: string | null) => void;
  appendToken: (token: string) => void;
  addToolEvent: (event: StreamingToolEvent) => void;
  updateToolEvent: (id: string, output: unknown) => void;
  updateToolEventThinking: (id: string, thought: string) => void;
  appendToolInput: (id: string, partialJson: string) => void;
  addStreamingArtifactId: (id: string) => void;
  finalizeStream: () => void;
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

    setPendingMessage: (msg) =>
      set((state) => {
        state.pendingMessage = msg as unknown as PendingMessage;
      }),

    setActiveThread: (id) =>
      set((state) => {
        state.activeThreadId = id;

        // Don't wipe streaming state mid-stream: when creating a new thread,
        // router.push() causes ThreadContainer to mount and call setActiveThread
        // before the SSE stream finishes. Clearing here would make the streaming
        // bubble disappear and lose all tokens already received.
        if (state.streamingStatus !== 'streaming') {
          state.streamingStatus = 'idle';
          state.streamingContent = '';
          state.streamingToolEvents = [];
          state.optimisticMessages = [];
        }
      }),

    startStream: (abortController) =>
      set((state) => {
        state.streamingStatus = 'streaming';
        state.streamingError = null;
        state.streamingContent = '';
        state.streamingToolEvents = [];
        state.streamingArtifactIds = [];
        state.optimisticMessages = [];
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

    abortStream: () => {
      const { abortController } = get();
      if (abortController) {
        (abortController as unknown as AbortController).abort();
      }
      set((state) => {
        state.streamingStatus = 'idle';
        state.streamingContent = '';
        state.abortController = null;
      });
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
