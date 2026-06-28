import { QueryClient } from '@tanstack/react-query';

/** Single app-wide QueryClient. Conservative defaults: one retry, 30s freshness. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
