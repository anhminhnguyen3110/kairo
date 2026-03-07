import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user-api';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => userApi.getMe(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export { displayNameFromEmail } from '@/lib/utils';
