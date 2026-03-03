import { apiClient } from '@/lib/api-client';
import type { Message, PaginatedResponse, CursorPaginationParams } from '@/types';

export type { SendMessagePayload } from '../types/chat.types';

export const chatApi = {
  getMessages(
    threadId: number,
    params?: CursorPaginationParams,
  ): Promise<PaginatedResponse<Message>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.cursor) query.set('cursor', params.cursor);
    const qs = query.toString();
    return apiClient.get<PaginatedResponse<Message>>(
      `/threads/${threadId}/messages${qs ? `?${qs}` : ''}`,
    );
  },
};
