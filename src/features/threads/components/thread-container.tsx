'use client';

import { useEffect } from 'react';
import { useThread } from '../hooks/use-threads';
import { MessageList } from '@/features/chat/components/message-list';
import { MessageInput } from '@/features/chat/components/message-input';
import { FilePanel } from '@/features/files/components/file-panel';
import { useChatStore } from '@/stores/chat-store';
import { ThreadHeader } from './thread-header';
import { useArtifacts } from '@/features/artifacts/hooks/use-artifact';

interface ThreadContainerProps {
  threadId: number;
}

export function ThreadContainer({ threadId }: ThreadContainerProps) {
  const { data: thread, isLoading } = useThread(threadId);
  const { setActiveThread } = useChatStore();

  useArtifacts(threadId);

  useEffect(() => {
    setActiveThread(threadId);
    return () => setActiveThread(null);
  }, [threadId, setActiveThread]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-stone-400">Thread not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-chat-bg overflow-hidden">
      <ThreadHeader thread={thread} />
      <MessageList threadId={threadId}>
        <MessageInput threadId={threadId} />
      </MessageList>
      <FilePanel />
    </div>
  );
}
