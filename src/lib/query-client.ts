import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from '@/lib/api-client';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiClientError) {
            if ([401, 403, 404].includes(error.statusCode)) return false;
          }
          return failureCount < 2;
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
