'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chat-api';

export function getMessagesQueryKey(threadId: number) {
  return ['threads', threadId, 'messages'] as const;
}

export function useMessages(threadId: number) {
  return useInfiniteQuery({
    queryKey: getMessagesQueryKey(threadId),
    queryFn: ({ pageParam }) =>
      chatApi.getMessages(threadId, { limit: 30, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    enabled: !!threadId,
    staleTime: 5 * 1000,
  });
}
