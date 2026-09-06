import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';

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

export function handleUnauthorized() {
  const wasLoggedIn = useAuthStore.getState().isLoggedIn;
  useAuthStore.getState().setLoggedIn(false);
  removeProtectedQueries();
  return wasLoggedIn;
}
