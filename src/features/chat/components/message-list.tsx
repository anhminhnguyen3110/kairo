'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMessages } from '../hooks/use-messages';
import { useStream } from '../hooks/use-stream';
import { useChatStore } from '@/stores/chat-store';
import { MessageBubble } from './message-bubble';
import { StreamingBubble } from './streaming-bubble';
import { ErrorBoundary } from '@/components/error-boundary';

interface MessageListProps {
  threadId: number;
  children?: React.ReactNode;
}

export function MessageList({ threadId, children }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(threadId);
  const { optimisticMessages, streamingStatus } = useChatStore();
  const { send } = useStream();

  // Handle stream resume on initial load if the last message is from the user and has a sessionId
  useEffect(() => {
    if (isLoading || !data) return;
    if (streamingStatus !== 'idle') return;

    const messages = data.pages
      .slice()
      .reverse()
      .flatMap((p) => [...p.data].reverse());

    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'USER' && lastMsg.metadata?.sessionId) {
        // Automatically attempt to resume stream
        send({
          threadId,
          message: '',
          sessionId: lastMsg.metadata.sessionId as string,
          isResume: true,
        }).catch(console.error);
      }
    }
  }, [isLoading, data, streamingStatus, threadId, send]);

  // Track whether the bottom sentinel is visible — if not, show the scroll button
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isAtBottomRef.current = entry.isIntersecting;
        setShowScrollBtn(!entry.isIntersecting);
      },
      { root: containerRef.current, threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleTopObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleTopObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleTopObserver]);

  // Auto-scroll when status changes (e.g. new optimistic message) — but only when at bottom
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    if (
      streamingStatus === 'streaming' ||
      streamingStatus === 'error' ||
      optimisticMessages.length > 0
    ) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingStatus, optimisticMessages.length]);

  // Auto-scroll on each streaming token WITHOUT re-rendering the whole component.
  // Using store.subscribe avoids a component re-render on every token append.
  useEffect(() => {
    const unsub = useChatStore.subscribe((state, prevState) => {
      if (state.streamingContent === prevState.streamingContent) return;
      if (!isAtBottomRef.current) return;
      if (state.streamingStatus === 'streaming') {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [isLoading]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const allMessages =
    data?.pages
      .slice()
      .reverse()
      .flatMap((p) => [...p.data].reverse()) ?? [];

  // Final defense: deduplicate allMessages by ID (real duplicates in cache)
  const deduplicatedAllMessages = allMessages.filter(
    (msg, index, arr) => arr.findIndex((m) => m.id === msg.id) === index,
  );

  const deduplicatedOptimistic = optimisticMessages.filter(
    (opt) => !deduplicatedAllMessages.some((m) => m.role === opt.role && m.content === opt.content),
  );

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[768px] mx-auto px-6 pt-8 flex flex-col">
          <div ref={topRef} className="mb-2">
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {}
          {!isLoading &&
            deduplicatedAllMessages.length === 0 &&
            deduplicatedOptimistic.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <p className="text-2xl font-semibold text-stone-800 mb-2">
                  How can I help you today?
                </p>
                <p className="text-sm text-stone-400">Start a conversation below</p>
              </div>
            )}

          {}
          {deduplicatedAllMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {}
          {deduplicatedOptimistic.map((msg) => (
            <MessageBubble key={`optimistic-${msg.id}`} message={msg} />
          ))}

          {}
          <ErrorBoundary label="Streaming response">
            <StreamingBubble />
          </ErrorBoundary>

          {}
          <div ref={bottomRef} />
          <div className="h-12" />
        </div>
      </div>

      {children}

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-stone-700 hover:bg-stone-600 border border-stone-600 text-stone-200 shadow-lg transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
