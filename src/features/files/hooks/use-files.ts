'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../api/files-api';

export const getFilesQueryKey = (threadId: number) => ['files', threadId] as const;

export function useFiles(threadId: number | undefined) {
  return useQuery({
    queryKey: getFilesQueryKey(threadId ?? 0),
    queryFn: () => filesApi.listByThread(threadId!),
    enabled: !!threadId,
    staleTime: 15 * 1000,
  });
}

export function useUploadFile(threadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => filesApi.upload(threadId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getFilesQueryKey(threadId) });
    },
  });
}

export function useDeleteFile(threadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: number) => filesApi.delete(fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getFilesQueryKey(threadId) });
    },
  });
}
