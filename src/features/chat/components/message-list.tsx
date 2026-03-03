'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMessages } from '../hooks/use-messages';
import { useChatStore } from '@/stores/chat-store';
import { MessageBubble } from './message-bubble';
import { StreamingBubble } from './streaming-bubble';

interface MessageListProps {
  threadId: number;
}

export function MessageList({ threadId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(threadId);
  const { optimisticMessages, streamingStatus, streamingContent } = useChatStore();

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

  // Auto-scroll on each new streaming token — but only when already at the bottom
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    if (
      streamingStatus === 'streaming' ||
      streamingStatus === 'error' ||
      optimisticMessages.length > 0
    ) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingContent, streamingStatus, optimisticMessages.length]);

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

  // Deduplicate: hide optimistic messages whose content already arrived from the server.
  // This prevents a duplicate flash when invalidateQueries resolves before
  // clearOptimisticMessages is called (race between message_stop and [DONE]).
  const deduplicatedOptimistic = optimisticMessages.filter(
    (opt) => !allMessages.some((m) => m.role === opt.role && m.content === opt.content),
  );

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[768px] mx-auto px-6 py-4">
          {}
          <div ref={topRef} className="mb-2">
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {}
          {allMessages.length === 0 && deduplicatedOptimistic.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <p className="text-2xl font-semibold text-stone-800 mb-2">
                How can I help you today?
              </p>
              <p className="text-sm text-stone-400">Start a conversation below</p>
            </div>
          )}

          {}
          {allMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {}
          {deduplicatedOptimistic.map((msg) => (
            <MessageBubble key={`optimistic-${msg.id}`} message={msg} />
          ))}

          {}
          <StreamingBubble />

          {}
          <div ref={bottomRef} />
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-stone-700 hover:bg-stone-600 border border-stone-600 text-stone-200 shadow-lg transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
