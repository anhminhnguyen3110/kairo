import { apiClient } from '@/lib/api-client';
import type { Thread, PaginatedResponse, CursorPaginationParams } from '@/types';

export interface UpdateThreadPayload {
  title?: string;
  llmProvider?: string;
}

export const threadsApi = {
  list(params?: CursorPaginationParams): Promise<PaginatedResponse<Thread>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiClient.get<PaginatedResponse<Thread>>(`/threads${qs ? `?${qs}` : ''}`);
  },

  search(q: string): Promise<PaginatedResponse<Thread>> {
    return threadsApi.list({ search: q, limit: 20 });
  },

  get(id: number): Promise<Thread> {
    return apiClient.get<Thread>(`/threads/${id}`);
  },

  update(id: number, payload: UpdateThreadPayload): Promise<Thread> {
    return apiClient.patch<Thread>(`/threads/${id}`, payload);
  },

  delete(id: number): Promise<void> {
    return apiClient.delete<void>(`/threads/${id}`);
  },

  create(): Promise<Thread> {
    return apiClient.post<Thread>('/threads', {});
  },

  clone(id: number, upToOrderIndex?: number): Promise<Thread> {
    return apiClient.post<Thread>(`/threads/${id}/clone`, { upToOrderIndex });
  },
};
