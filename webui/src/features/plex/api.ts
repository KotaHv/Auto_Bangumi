import { axios } from '@/lib/axios';

export interface PlexConnection {
  connected: boolean;
  account_reauth_required: boolean;
  enabled: boolean;
  url: string;
  section_id: number | null;
  path: string;
  server_identifier: string | null;
}

export interface PlexLibrary {
  id: number;
  title: string;
  paths: string[];
}

export interface PlexServer {
  id: string;
  name: string;
}

export interface PlexServerAddress {
  host: string;
  port: number;
  ssl: boolean;
}

export interface PlexAuthStart {
  auth_url: string;
}

export type PlexAuthStatusResponse =
  | { status: 'pending'; auth_url: string }
  | { status: 'idle' | 'completed' | 'expired' };

export const apiPlex = {
  async startAuth(signal?: AbortSignal) {
    const { data } = await axios.post<PlexAuthStart>(
      'api/v1/plex/auth/start',
      undefined,
      { signal, suppressGlobalErrorToast: true },
    );
    return data;
  },
  async getAuthStatus(signal?: AbortSignal) {
    const { data } = await axios.get<PlexAuthStatusResponse>(
      'api/v1/plex/auth/status',
      { signal, suppressGlobalErrorToast: true },
    );
    return data;
  },
  async getConnection(signal?: AbortSignal) {
    const { data } = await axios.get<PlexConnection>('api/v1/plex/connection', {
      signal,
      suppressGlobalErrorToast: true,
    });
    return data;
  },
  async getServers(signal?: AbortSignal) {
    const { data } = await axios.get<PlexServer[]>('api/v1/plex/servers', {
      signal,
      suppressGlobalErrorToast: true,
    });
    return data;
  },
  async getServerLibraries(serverId: string, signal?: AbortSignal) {
    const { data } = await axios.get<{
      url: string;
      libraries: PlexLibrary[];
    }>(`api/v1/plex/servers/${encodeURIComponent(serverId)}/libraries`, {
      signal,
      suppressGlobalErrorToast: true,
    });
    return data;
  },
  async getLibraries(address: PlexServerAddress, signal?: AbortSignal) {
    const { data } = await axios.post<PlexLibrary[]>(
      'api/v1/plex/libraries',
      address,
      { signal, suppressGlobalErrorToast: true },
    );
    return data;
  },
  async saveConnection(
    connection: PlexServerAddress & {
      section_id: number;
      path: string;
    },
  ) {
    const { data } = await axios.patch<PlexConnection>(
      'api/v1/plex/connection',
      connection,
      { suppressGlobalErrorToast: true },
    );
    return data;
  },
  async setEnabled(enabled: boolean) {
    const { data } = await axios.patch<PlexConnection>(
      'api/v1/plex/connection/enabled',
      { enabled },
      { suppressGlobalErrorToast: true },
    );
    return data;
  },
  async refreshLibrary() {
    const { data } = await axios.post<{ status: string }>(
      'api/v1/plex/refresh',
      undefined,
      { suppressGlobalErrorToast: true },
    );
    return data;
  },
  async disconnect() {
    const { data } = await axios.delete<PlexConnection>(
      'api/v1/plex/connection',
      { suppressGlobalErrorToast: true },
    );
    return data;
  },
};
