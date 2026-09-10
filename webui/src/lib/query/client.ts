import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function removeProtectedQueries() {
  queryClient.removeQueries({
    predicate: (query) => query.meta?.requiresAuth === true,
  });
}
