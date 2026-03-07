import { describe, it, expect, beforeEach, vi } from 'vitest';

let useChatStore: typeof import('./chat-store').useChatStore;

beforeEach(async () => {
  vi.resetModules();
  ({ useChatStore } = await import('./chat-store'));
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
      useChatStore.setState({
        activeThreadId: 1,
        streamingContent: 'partial',
        streamingStatus: 'idle',
      });
      useChatStore.getState().setActiveThread(2);
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('clears streaming content when changing to a different thread while streaming (F10 fix)', () => {
      useChatStore.setState({
        activeThreadId: 1,
        streamingContent: 'partial',
        streamingStatus: 'streaming',
      });
      useChatStore.getState().setActiveThread(2);
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('clears streaming content when changing to a different thread in saving state (F10 fix)', () => {
      useChatStore.setState({
        activeThreadId: 2,
        streamingContent: 'done text',
        streamingStatus: 'saving',
      });
      useChatStore.getState().setActiveThread(3);
      expect(useChatStore.getState().streamingContent).toBe('');
    });

    it('preserves optimisticMessages when transitioning from null → new thread (isNewChatToThread / BUG-1)', () => {
      const msg = { id: -1, content: 'Hi', role: 'USER' } as never;
      useChatStore.setState({
        activeThreadId: null,
        optimisticMessages: [msg],
        streamingStatus: 'streaming',
      });
      useChatStore.getState().setActiveThread(42);
      expect(useChatStore.getState().activeThreadId).toBe(42);
      expect(useChatStore.getState().optimisticMessages).toHaveLength(1);
    });

    it('clears optimisticMessages when switching between two existing threads', () => {
      const msg = { id: -1, content: 'Stale message', role: 'USER' } as never;
      useChatStore.setState({
        activeThreadId: 1,
        optimisticMessages: [msg],
        streamingStatus: 'idle',
      });
      useChatStore.getState().setActiveThread(2);
      expect(useChatStore.getState().optimisticMessages).toHaveLength(0);
    });

    it('does not abort an in-flight stream when going from null → new thread (isNewChatToThread)', () => {
      const ac = new AbortController();
      const spy = vi.spyOn(ac, 'abort');
      useChatStore.setState({
        activeThreadId: null,
        abortController: ac as unknown as null,
        streamingStatus: 'streaming',
      });
      useChatStore.getState().setActiveThread(99);
      expect(spy).not.toHaveBeenCalled();
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

    it('handles appendToolInput for unknown event ID gracefully', () => {
      expect(() => useChatStore.getState().appendToolInput('no-such-id', 'abc')).not.toThrow();
    });
  });

  describe('updateToolEventThinking()', () => {
    it('appends thought text to the matching event', () => {
      useChatStore
        .getState()
        .addToolEvent({ id: 'think1', name: 'think', input: {}, status: 'pending' });
      useChatStore.getState().updateToolEventThinking('think1', 'Thinking...');
      useChatStore.getState().updateToolEventThinking('think1', ' More thoughts');
      const evt = useChatStore.getState().streamingToolEvents[0];
      expect(evt.input.thought).toBe('Thinking... More thoughts');
    });

    it('initialises thought from empty string when input.thought is missing', () => {
      useChatStore
        .getState()
        .addToolEvent({ id: 'e1', name: 'tool', input: {}, status: 'pending' });
      useChatStore.getState().updateToolEventThinking('e1', 'first thought');
      expect(useChatStore.getState().streamingToolEvents[0].input.thought).toBe('first thought');
    });

    it('ignores unknown event IDs without throwing', () => {
      expect(() =>
        useChatStore.getState().updateToolEventThinking('no-such-id', 'thought'),
      ).not.toThrow();
      expect(useChatStore.getState().streamingToolEvents).toHaveLength(0);
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

    it('resets state when called from saving status', () => {
      useChatStore.setState({ streamingContent: 'done text', streamingStatus: 'saving' });
      useChatStore.getState().finalizeStream();
      expect(useChatStore.getState().streamingStatus).toBe('idle');
      expect(useChatStore.getState().streamingContent).toBe('');
    });
  });

  describe('setSavingStatus()', () => {
    it('transitions status to saving', () => {
      const ac = new AbortController();
      useChatStore.setState({
        streamingStatus: 'streaming',
        abortController: ac as unknown as null,
      });
      useChatStore.getState().setSavingStatus();
      expect(useChatStore.getState().streamingStatus).toBe('saving');
    });

    it('clears abortController', () => {
      const ac = new AbortController();
      useChatStore.setState({ abortController: ac as unknown as null });
      useChatStore.getState().setSavingStatus();
      expect(useChatStore.getState().abortController).toBeNull();
    });

    it('preserves streamingContent during saving', () => {
      useChatStore.setState({ streamingContent: 'AI response text' });
      useChatStore.getState().setSavingStatus();
      expect(useChatStore.getState().streamingContent).toBe('AI response text');
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

    it('clears the session ID when null is passed', () => {
      useChatStore.getState().setStreamingSessionId('sess-abc');
      useChatStore.getState().setStreamingSessionId(null);
      expect(useChatStore.getState().streamingSessionId).toBeNull();
    });
  });

  describe('abortStream()', () => {
    it('calls abort() on the AbortController', () => {
      const ac = new AbortController();
      const spy = vi.spyOn(ac, 'abort');
      useChatStore.setState({ abortController: ac as unknown as null });
      useChatStore.getState().abortStream();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('resets streamingStatus to idle and clears streamingContent', () => {
      const ac = new AbortController();
      useChatStore.setState({
        abortController: ac as unknown as null,
        streamingContent: 'partial',
        streamingStatus: 'streaming',
      });
      useChatStore.getState().abortStream();
      const s = useChatStore.getState();
      expect(s.streamingStatus).toBe('idle');
      expect(s.streamingContent).toBe('');
      expect(s.abortController).toBeNull();
    });

    it('handles missing abortController gracefully (no-op abort, still resets state)', () => {
      useChatStore.setState({ abortController: null, streamingContent: 'partial' });
      expect(() => useChatStore.getState().abortStream()).not.toThrow();
      expect(useChatStore.getState().streamingStatus).toBe('idle');
      expect(useChatStore.getState().streamingContent).toBe('');
    });
  });
});
