import { queryOptions } from '@tanstack/react-query';
import { apiPlex, type PlexLibrary, type PlexServerAddress } from './api';

export type PlexLibraryLookup =
  { address: PlexServerAddress } | { serverId: string | null };

interface LibraryLookupResult {
  libraries: PlexLibrary[];
  url?: string;
}

export const plexKeys = {
  all: ['plex'] as const,
  connection: () => [...plexKeys.all, 'connection'] as const,
  authStatus: () => [...plexKeys.all, 'auth-status'] as const,
  servers: () => [...plexKeys.all, 'servers'] as const,
  libraries: (input: PlexLibraryLookup) =>
    [...plexKeys.all, 'libraries', input] as const,
};

export const plexMutationKeys = {
  connectionWrite: () => [...plexKeys.all, 'connection', 'write'] as const,
};

export function plexConnectionOptions() {
  return queryOptions({
    queryKey: plexKeys.connection(),
    queryFn: ({ signal }) => apiPlex.getConnection(signal),
    refetchInterval: (query) =>
      query.state.data?.connected && !query.state.data.account_reauth_required
        ? 30_000
        : false,
    meta: { requiresAuth: true },
  });
}

export function plexLibrariesOptions(input: PlexLibraryLookup) {
  return queryOptions({
    queryKey: plexKeys.libraries(input),
    enabled: false,
    queryFn: async ({ signal }): Promise<LibraryLookupResult> => {
      if ('address' in input) {
        return { libraries: await apiPlex.getLibraries(input.address, signal) };
      }
      if (input.serverId === null) {
        throw new Error('Cannot load libraries without selecting a server.');
      }
      return apiPlex.getServerLibraries(input.serverId, signal);
    },
    retry: false,
    gcTime: 0,
    meta: { requiresAuth: true },
  });
}

export function plexServersOptions(enabled: boolean) {
  return queryOptions({
    queryKey: plexKeys.servers(),
    queryFn: ({ signal }) => apiPlex.getServers(signal),
    enabled,
    meta: { requiresAuth: true },
  });
}
