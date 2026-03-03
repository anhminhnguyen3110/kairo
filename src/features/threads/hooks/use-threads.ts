'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { threadsApi, type UpdateThreadPayload } from '../api/threads-api';
import type { Thread } from '@/types';

export const THREADS_QUERY_KEY = ['threads'] as const;

export function useThreads() {
  return useInfiniteQuery({
    queryKey: THREADS_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      threadsApi.list({ limit: 30, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    staleTime: 10 * 1000,
  });
}

export function useThread(id: number) {
  return useQuery({
    queryKey: ['threads', id],
    queryFn: () => threadsApi.get(id),
    enabled: !!id,
  });
}

export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateThreadPayload }) =>
      threadsApi.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: THREADS_QUERY_KEY });
      const previous = qc.getQueryData(THREADS_QUERY_KEY);
      qc.setQueriesData({ queryKey: THREADS_QUERY_KEY }, (old: unknown) => {
        if (!old) return old;

        const data = old as { pages?: Array<{ data: Thread[] }> };
        if (!data.pages) return old;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((t) => (t.id === id ? { ...t, ...payload } : t)),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(THREADS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => threadsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
}

export function useCloneThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, upToOrderIndex }: { id: number; upToOrderIndex?: number }) =>
      threadsApi.clone(id, upToOrderIndex),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
}

export function useSearchThreads(query: string) {
  return useQuery({
    queryKey: ['threads', 'search', query],
    queryFn: () => threadsApi.search(query),
    enabled: query.trim().length > 0,
    staleTime: 5 * 1000,
    placeholderData: (prev) => prev,
  });
}
