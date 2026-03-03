'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProviderModels } from '../types/chat.types';

export type { ModelInfo, ProviderModels } from '../types/chat.types';

export const MODELS_QUERY_KEY = ['llm', 'models'] as const;

export function useModels() {
  return useQuery<ProviderModels[]>({
    queryKey: MODELS_QUERY_KEY,
    queryFn: () => apiClient.get<ProviderModels[]>('/llm/models'),
    staleTime: 5 * 60 * 1000,
  });
}
