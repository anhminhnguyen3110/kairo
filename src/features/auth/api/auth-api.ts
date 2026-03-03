import { apiClient } from '@/lib/api-client';
import type { LoginPayload, RegisterPayload, AuthResponse } from '../types/auth.types';

export type { LoginPayload, RegisterPayload, AuthResponse };

export const authApi = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient.auth.post<AuthResponse>('/api/auth/login', payload);
  },

  register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiClient.auth.post<AuthResponse>('/api/auth/register', payload);
  },

  logout(): Promise<void> {
    return apiClient.auth.post<void>('/api/auth/logout');
  },

  refresh(): Promise<{ ok: boolean }> {
    return apiClient.auth.post<{ ok: boolean }>('/api/auth/refresh');
  },
};
