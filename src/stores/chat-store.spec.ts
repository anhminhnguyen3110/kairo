import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * We import the zustand store directly and test its actions through the API
 * `useChatStore.getState()` / `useChatStore.setState()`.
 *
 * No React rendering is needed — zustand stores are plain vanilla JS objects.
 */

// Reset the store to initial state before each test
let useChatStore: typeof import('./chat-store').useChatStore;

beforeEach(async () => {
  vi.resetModules();
  ({ useChatStore } = await import('./chat-store'));
  // Reset to initial state
  useChatStore.setState({
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
  });
});

describe('useChatStore', () => {
  describe('setActiveThread()', () => {
    it('sets activeThreadId', () => {
      useChatStore.getState().setActiveThread(42);
      expect(useChatStore.getState().activeThreadId).toBe(42);
    });

    it('clears streaming state when not streaming', () => {
      useChatStore.setState({ streamingContent: 'partial', streamingStatus: 'idle' });
      useChatStore.getState().setActiveThread(1);
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('does NOT clear streaming content when actively streaming', () => {
      useChatStore.setState({ streamingContent: 'partial', streamingStatus: 'streaming' });
      useChatStore.getState().setActiveThread(2);
      expect(useChatStore.getState().streamingContent).toBe('partial');
    });
  });

  describe('startStream()', () => {
    it('sets status to streaming and resets content', () => {
      const ac = new AbortController();
      useChatStore.setState({ streamingContent: 'leftover' });
      useChatStore.getState().startStream(ac);
      const s = useChatStore.getState();
      expect(s.streamingStatus).toBe('streaming');
      expect(s.streamingContent).toBe('');
      expect(s.streamingError).toBeNull();
    });
  });

  describe('appendToken()', () => {
    it('accumulates tokens into streamingContent', () => {
      useChatStore.getState().appendToken('Hello');
      useChatStore.getState().appendToken(' world');
      expect(useChatStore.getState().streamingContent).toBe('Hello world');
    });
  });

  describe('addToolEvent()', () => {
    it('pushes a new tool event', () => {
      useChatStore
        .getState()
        .addToolEvent({ id: 'evt1', name: 'search', input: {}, status: 'pending' });
      expect(useChatStore.getState().streamingToolEvents).toHaveLength(1);
      expect(useChatStore.getState().streamingToolEvents[0].name).toBe('search');
    });
  });

  describe('updateToolEvent()', () => {
    it('marks the matching event as done with output', () => {
      useChatStore
        .getState()
        .addToolEvent({ id: 'evt1', name: 'search', input: {}, status: 'pending' });
      useChatStore.getState().updateToolEvent('evt1', { results: [] });
      const evt = useChatStore.getState().streamingToolEvents[0];
      expect(evt.status).toBe('done');
      expect(evt.output).toEqual({ results: [] });
    });

    it('ignores unknown event IDs', () => {
      useChatStore.getState().updateToolEvent('unknown-id', {});
      expect(useChatStore.getState().streamingToolEvents).toHaveLength(0);
    });
  });

  describe('appendToolInput()', () => {
    it('accumulates partial JSON for the tool event', () => {
      useChatStore
        .getState()
        .addToolEvent({ id: 't1', name: 'tool', input: {}, status: 'pending' });
      useChatStore.getState().appendToolInput('t1', '{"q":');
      useChatStore.getState().appendToolInput('t1', '"hello"}');
      const evt = useChatStore.getState().streamingToolEvents[0];
      expect(evt.input.input).toBe('{"q":"hello"}');
    });
  });

  describe('addStreamingArtifactId()', () => {
    it('adds a unique artifact ID', () => {
      useChatStore.getState().addStreamingArtifactId('uuid-1');
      useChatStore.getState().addStreamingArtifactId('uuid-1'); // duplicate
      expect(useChatStore.getState().streamingArtifactIds).toHaveLength(1);
    });

    it('adds multiple distinct IDs', () => {
      useChatStore.getState().addStreamingArtifactId('a');
      useChatStore.getState().addStreamingArtifactId('b');
      expect(useChatStore.getState().streamingArtifactIds).toHaveLength(2);
    });
  });

  describe('finalizeStream()', () => {
    it('resets all streaming state', () => {
      useChatStore.setState({ streamingContent: 'some content', streamingStatus: 'streaming' });
      useChatStore.getState().finalizeStream();
      const s = useChatStore.getState();
      expect(s.streamingStatus).toBe('idle');
      expect(s.streamingContent).toBe('');
      expect(s.streamingToolEvents).toHaveLength(0);
      expect(s.abortController).toBeNull();
    });
  });

  describe('setStreamError()', () => {
    it('sets status to error with provided message', () => {
      useChatStore.getState().setStreamError('Network timeout');
      expect(useChatStore.getState().streamingStatus).toBe('error');
      expect(useChatStore.getState().streamingError).toBe('Network timeout');
    });

    it('uses default message when none is provided', () => {
      useChatStore.getState().setStreamError();
      expect(useChatStore.getState().streamingError).toBeTruthy();
    });
  });

  describe('setPendingMessage()', () => {
    it('stores and clears a pending message', () => {
      useChatStore.getState().setPendingMessage({ content: 'hello', attachments: [] });
      expect(useChatStore.getState().pendingMessage?.content).toBe('hello');
      useChatStore.getState().setPendingMessage(null);
      expect(useChatStore.getState().pendingMessage).toBeNull();
    });
  });

  describe('setFileAttachments()', () => {
    it('stores attachments keyed by threadId:content', () => {
      const attachments = [
        { name: 'file.pdf', mimeType: 'application/pdf', sizeBytes: 123, url: '' },
      ];
      useChatStore.getState().setFileAttachments(1, 'hello', attachments);
      expect(useChatStore.getState().fileAttachmentsByKey['1:hello']).toEqual(attachments);
    });
  });

  describe('addOptimisticMessage() / clearOptimisticMessages()', () => {
    it('adds and then clears optimistic messages', () => {
      const msg = { id: 1, content: 'Hi', role: 'USER' } as never;
      useChatStore.getState().addOptimisticMessage(msg);
      expect(useChatStore.getState().optimisticMessages).toHaveLength(1);
      useChatStore.getState().clearOptimisticMessages();
      expect(useChatStore.getState().optimisticMessages).toHaveLength(0);
    });
  });

  describe('setStreamingSessionId()', () => {
    it('stores the session ID', () => {
      useChatStore.getState().setStreamingSessionId('sess-123');
      expect(useChatStore.getState().streamingSessionId).toBe('sess-123');
    });
  });
});
