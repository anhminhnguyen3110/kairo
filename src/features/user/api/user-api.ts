import { apiClient } from '@/lib/api-client';
import type { User } from '@/types';

export const userApi = {
  getMe(): Promise<User> {
    return apiClient.get<User>('/users/me');
  },
};
