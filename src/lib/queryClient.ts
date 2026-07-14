import { QueryClient } from "@tanstack/react-query";

let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(500 * Math.pow(2, attemptIndex), 8000),
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000,   // 10 minutes
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    });
  }
  return queryClientInstance;
}
