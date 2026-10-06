import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPlex, type PlexConnection, type PlexServerAddress } from './api';
import {
  plexKeys,
  plexLibrariesOptions,
  plexMutationKeys,
  plexServersOptions,
  type PlexLibraryLookup,
} from './queries';

interface ServerAddress {
  host: string;
  port: string;
  useSsl: boolean;
}

interface LibrarySelection {
  sectionId: number | null;
  path: string;
}

function addressFromUrl(url: string): ServerAddress {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      useSsl: parsed.protocol === 'https:',
    };
  } catch {
    return { host: '', port: '32400', useSsl: false };
  }
}

function isValidServerAddress(address: ServerAddress): boolean {
  const port = Number(address.port);
  return (
    address.host.trim() !== '' &&
    Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535
  );
}

export function usePlexLibrarySelection(
  connection: PlexConnection,
  onSaved: () => void,
) {
  const queryClient = useQueryClient();
  const serversQuery = useQuery(plexServersOptions(connection.connected));
  const [serverAddress, setServerAddress] = useState(() =>
    addressFromUrl(connection.url),
  );
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState(
    connection.server_identifier,
  );
  const [addressError, setAddressError] = useState(false);
  const [draftSelection, setDraftSelection] = useState<LibrarySelection | null>(
    null,
  );

  const libraryLookup: PlexLibraryLookup = isCustomAddress
    ? {
        address: {
          host: serverAddress.host,
          port: Number(serverAddress.port),
          ssl: serverAddress.useSsl,
        },
      }
    : { serverId: selectedServerId };
  const librariesQuery = useQuery(plexLibrariesOptions(libraryLookup));
  const isLibraryLoading = librariesQuery.fetchStatus !== 'idle';
  const loadedLibraries =
    !isLibraryLoading && librariesQuery.isSuccess
      ? librariesQuery.data
      : undefined;

  const savedLibrary = loadedLibraries?.libraries.find(
    (library) =>
      library.id === connection.section_id &&
      library.paths.includes(connection.path),
  );
  const defaultSelection: LibrarySelection = {
    sectionId: savedLibrary?.id ?? null,
    path: savedLibrary ? connection.path : '',
  };
  const { sectionId, path } = draftSelection ?? defaultSelection;
  const selectedLibrary = loadedLibraries?.libraries.find(
    (library) => library.id === sectionId,
  );
  const isCustomAddressValid = isValidServerAddress(serverAddress);
  const hasTargetAddress = isCustomAddress
    ? isCustomAddressValid
    : Boolean(loadedLibraries?.url);
  const canSave = Boolean(
    connection.connected &&
    hasTargetAddress &&
    sectionId !== null &&
    selectedLibrary?.paths.includes(path),
  );

  const serverAddressForSave = isCustomAddress
    ? serverAddress
    : addressFromUrl(loadedLibraries?.url ?? '');
  const addressForSave: PlexServerAddress = {
    host: serverAddressForSave.host,
    port: Number(serverAddressForSave.port),
    ssl: serverAddressForSave.useSsl,
  };
  const savedAddress = addressFromUrl(connection.url);
  const hasAddressChanged =
    addressForSave.host !== savedAddress.host ||
    addressForSave.port !== Number(savedAddress.port) ||
    addressForSave.ssl !== savedAddress.useSsl;
  const hasLibraryChanged =
    sectionId !== connection.section_id || path !== connection.path;
  const hasServerChanged =
    !isCustomAddress && selectedServerId !== connection.server_identifier;
  const hasSelectionChanged = Boolean(
    canSave && (hasAddressChanged || hasLibraryChanged || hasServerChanged),
  );

  const saveMutation = useMutation({
    mutationKey: plexMutationKeys.connectionWrite(),
    mutationFn: apiPlex.saveConnection,
    onSuccess: async (result) => {
      await queryClient.cancelQueries({
        queryKey: plexKeys.connection(),
        exact: true,
      });
      queryClient.setQueryData(plexKeys.connection(), result);
      setDraftSelection(null);
      onSaved();
    },
  });

  const clearSelection = () => {
    setDraftSelection(null);
    setAddressError(false);
  };
  const setCustomAddress = (enabled: boolean) => {
    setIsCustomAddress(enabled);
    clearSelection();
  };
  const updateServerAddress = (address: Partial<ServerAddress>) => {
    setServerAddress((current) => ({ ...current, ...address }));
    clearSelection();
  };
  const selectServer = (serverId: string) => {
    setSelectedServerId(serverId);
    clearSelection();
  };
  const selectSection = (id: number) => {
    setDraftSelection({ sectionId: id, path: '' });
  };
  const selectPath = (selectedPath: string) => {
    setDraftSelection({ sectionId, path: selectedPath });
  };
  const saveSelection = () => {
    if (!canSave || sectionId === null || saveMutation.isPending) return;

    saveMutation.mutate({
      ...addressForSave,
      section_id: sectionId,
      path,
    });
  };
  const loadLibraries = () => {
    if (
      !connection.connected ||
      isLibraryLoading ||
      (isCustomAddress && !isCustomAddressValid) ||
      (!isCustomAddress && !selectedServerId)
    ) {
      if (isCustomAddress && !isCustomAddressValid) setAddressError(true);
      return;
    }

    setAddressError(false);
    setDraftSelection(null);
    void librariesQuery.refetch();
  };

  return {
    state: {
      serverAddress,
      customAddress: isCustomAddress,
      selectedServerId,
      addressError,
      sectionId,
      path,
      libraryLoading: isLibraryLoading,
      libraryError:
        librariesQuery.isError && !isLibraryLoading
          ? librariesQuery.error
          : null,
    },
    serversQuery,
    loaded: loadedLibraries,
    selectedLibrary,
    canSave,
    hasSelectionChanged,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    saveSelection,
    setCustomAddress,
    setServerAddress: updateServerAddress,
    setSelectedServerId: selectServer,
    setSectionId: selectSection,
    setPath: selectPath,
    loadLibraries,
  };
}
