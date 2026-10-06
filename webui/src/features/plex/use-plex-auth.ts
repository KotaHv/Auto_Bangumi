import { useEffect, useRef, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPlex, type PlexAuthStatusResponse } from './api';
import { plexKeys } from './queries';

const POLL_INTERVAL_MS = 1000;
const authStatusKey = plexKeys.authStatus();

type PlexAuthState =
  | { kind: 'checking' }
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'pending'; url: string }
  | { kind: 'completed' }
  | { kind: 'expired' }
  | { kind: 'error'; url?: string; error?: unknown };

interface AuthStartState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

interface AuthStatusState {
  data: PlexAuthStatusResponse | undefined;
  isError: boolean;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
}

function isSafeAuthUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://app.plex.tv' && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

function getSafePendingAuthUrl(
  data: PlexAuthStatusResponse | undefined,
): string | undefined {
  if (data?.status !== 'pending' || !isSafeAuthUrl(data.auth_url)) {
    return undefined;
  }
  return data.auth_url;
}

function redirectAuthPopup(
  popupRef: RefObject<Window | null>,
  url: string,
): void {
  const popup = popupRef.current;
  try {
    if (popup && !popup.closed) popup.location.replace(url);
  } catch {
    closeAuthPopup(popupRef);
  }
}

function closeAuthPopup(popupRef: RefObject<Window | null>): void {
  const popup = popupRef.current;
  popupRef.current = null;
  try {
    popup?.close();
  } catch {
    // The authorization link remains available if the browser prevents closing the tab.
  }
}

export function usePlexAuth() {
  const queryClient = useQueryClient();
  const authPopup = useRef<Window | null>(null);
  const startAuthRequested = useRef(false);
  const connectionSyncRequested = useRef(false);
  const startMutation = useMutation({
    mutationFn: async () => {
      const result = await apiPlex.startAuth();
      if (!isSafeAuthUrl(result.auth_url)) {
        throw new Error('Plex authorization URL is invalid');
      }
      return result;
    },
    onSuccess: (result) => {
      startAuthRequested.current = false;
      redirectAuthPopup(authPopup, result.auth_url);
      queryClient.setQueryData(authStatusKey, {
        status: 'pending' as const,
        auth_url: result.auth_url,
      });
    },
    onError: () => {
      startAuthRequested.current = false;
      closeAuthPopup(authPopup);
    },
  });

  const authStatusQuery = useQuery({
    queryKey: authStatusKey,
    queryFn: ({ signal }) => apiPlex.getAuthStatus(signal),
    enabled: !startMutation.isPending,
    refetchInterval: (query) => {
      if (
        query.state.status === 'error' ||
        query.state.data?.status !== 'pending'
      ) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
    meta: { requiresAuth: true },
  });

  const authStatus = authStatusQuery.data?.status;

  useEffect(() => {
    if (authStatus === 'completed') {
      if (!connectionSyncRequested.current) {
        connectionSyncRequested.current = true;
        closeAuthPopup(authPopup);
        void queryClient.invalidateQueries({ queryKey: plexKeys.connection() });
      }
      return;
    }

    connectionSyncRequested.current = false;
    if (authStatus === 'expired') closeAuthPopup(authPopup);
  }, [authStatus, queryClient]);

  const state = getAuthState(startMutation, authStatusQuery);
  const canStartAuth = state.kind === 'idle' || state.kind === 'expired';

  const startAuth = async () => {
    if (!canStartAuth || startAuthRequested.current) return;

    closeAuthPopup(authPopup);
    startAuthRequested.current = true;
    authPopup.current = window.open('about:blank', '_blank');
    if (authPopup.current) authPopup.current.opener = null;
    await queryClient.cancelQueries({ queryKey: authStatusKey, exact: true });
    startMutation.mutate();
  };

  const retryAuthorizationCheck = () => {
    if (state.kind !== 'error') return;

    if (startMutation.isError) startMutation.reset();
    void authStatusQuery.refetch();
  };

  return {
    state,
    isStarting: state.kind === 'starting',
    startAuth,
    retryAuthorizationCheck,
  };
}

function getAuthState(
  startMutation: AuthStartState,
  authStatusQuery: AuthStatusState,
): PlexAuthState {
  if (startMutation.isPending) return { kind: 'starting' };

  const authStatus = authStatusQuery.data?.status;
  const authUrl = getSafePendingAuthUrl(authStatusQuery.data);
  if (authStatusQuery.isError) {
    if (authUrl) {
      return { kind: 'error', error: authStatusQuery.error, url: authUrl };
    }
    return { kind: 'error', error: authStatusQuery.error };
  }

  if (
    authStatusQuery.isPending ||
    (authStatusQuery.isFetching && authStatus !== 'pending')
  ) {
    return { kind: 'checking' };
  }

  if (
    startMutation.isError &&
    authStatus !== 'pending' &&
    authStatus !== 'completed'
  ) {
    return { kind: 'error', error: startMutation.error };
  }

  switch (authStatus) {
    case 'pending':
      if (!authUrl) return { kind: 'error' };
      return { kind: 'pending', url: authUrl };
    case 'completed':
    case 'expired':
    case 'idle':
      return { kind: authStatus };
    default:
      return { kind: 'error' };
  }
}
