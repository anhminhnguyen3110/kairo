import { apiClient } from '@/lib/api-client';
import type { User } from '@/types';

export interface UpdateProfilePayload {
  timezone?: string | null;
}

export const userApi = {
  getMe(): Promise<User> {
    return apiClient.get<User>('/users/me');
  },

  updateProfile(payload: UpdateProfilePayload): Promise<User> {
    return apiClient.patch<User>('/users/me', payload);
  },
};
