import { useTranslation } from 'react-i18next';
import { AbSelect } from '@/components/shared/ab-select';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import type { PlexConnection } from '../../api';
import { getPlexErrorMessage } from '../../errors';
import { usePlexLibrarySelection } from '../../use-plex-library-selection';

type PlexLibrarySelection = ReturnType<typeof usePlexLibrarySelection>;
type ServerFieldsSelection = Pick<
  PlexLibrarySelection,
  | 'state'
  | 'serversQuery'
  | 'setCustomAddress'
  | 'setSelectedServerId'
  | 'setServerAddress'
>;
type LibraryFieldsSelection = Pick<
  PlexLibrarySelection,
  'state' | 'loaded' | 'selectedLibrary' | 'setSectionId' | 'setPath'
>;

interface PlexLibrarySectionProps {
  connection: PlexConnection;
  onSaved: () => void;
}

export function PlexLibrarySection({
  connection,
  onSaved,
}: PlexLibrarySectionProps) {
  const { t } = useTranslation();
  const selection = usePlexLibrarySelection(connection, onSaved);
  return (
    <section className="px-5 py-4" aria-labelledby="plex-library-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="plex-library-heading"
          className="font-heading text-base leading-snug font-medium"
        >
          {t('plexPage.libraryTitle')}
        </h2>
      </div>
      <div className="mt-3">
        <FieldGroup>
          <PlexServerFields selection={selection} />
          <LoadLibrariesButton selection={selection} />
          <PlexLibraryFields selection={selection} />
        </FieldGroup>
        {connection.connected && selection.saveError && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {getPlexErrorMessage(selection.saveError, t('plexPage.saveError'))}
          </p>
        )}
      </div>
      {connection.connected && selection.hasSelectionChanged && (
        <div className="mt-4 flex w-full">
          <Button
            className="w-full"
            size="lg"
            onClick={selection.saveSelection}
            variant="brand"
            disabled={!selection.canSave || selection.isSaving}
          >
            {selection.isSaving ? (
              <>
                <Spinner data-icon="inline-start" />
                {t('plexPage.saving')}
              </>
            ) : (
              t('plexPage.save')
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

function PlexServerFields({ selection }: { selection: ServerFieldsSelection }) {
  const { t } = useTranslation();
  const { state, serversQuery } = selection;
  const { data: servers, isError, isFetching, isPending } = serversQuery;
  const hasNoServers = !isPending && !isError && servers?.length === 0;

  return (
    <>
      {isError && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-destructive text-sm">
            {getPlexErrorMessage(
              serversQuery.error,
              t('plexPage.serverDiscoveryError'),
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void serversQuery.refetch()}
          >
            {isFetching ? (
              <>
                <Spinner data-icon="inline-start" />
                {t('plexPage.loadingServers')}
              </>
            ) : (
              t('plexPage.retry')
            )}
          </Button>
        </div>
      )}
      {hasNoServers && (
        <p role="status" className="text-muted-foreground text-sm">
          {t('plexPage.noServers')}
        </p>
      )}
      <Field orientation="horizontal" className="w-full justify-between">
        <FieldLabel htmlFor="plex-custom-address">
          {t('plexPage.customAddress')}
        </FieldLabel>
        <Switch
          id="plex-custom-address"
          checked={state.customAddress}
          onCheckedChange={selection.setCustomAddress}
          disabled={state.libraryLoading}
        />
      </Field>
      {state.customAddress ? (
        <CustomServerAddressFields selection={selection} />
      ) : (
        <DiscoveredServerField selection={selection} />
      )}
    </>
  );
}

function CustomServerAddressFields({
  selection,
}: {
  selection: ServerFieldsSelection;
}) {
  const { t } = useTranslation();
  const { state, setServerAddress } = selection;
  const { serverAddress, addressError, libraryLoading } = state;

  return (
    <>
      <Field data-invalid={addressError || undefined}>
        <FieldLabel htmlFor="plex-server-host">
          {t('plexPage.serverHost')}
        </FieldLabel>
        <Input
          id="plex-server-host"
          placeholder="192.168.1.10"
          value={serverAddress.host}
          aria-invalid={addressError}
          disabled={libraryLoading}
          onChange={(event) => setServerAddress({ host: event.target.value })}
        />
        <FieldDescription>{t('plexPage.serverHostHint')}</FieldDescription>
      </Field>
      <Field data-invalid={addressError || undefined}>
        <FieldLabel htmlFor="plex-server-port">
          {t('plexPage.serverPort')}
        </FieldLabel>
        <Input
          id="plex-server-port"
          type="number"
          min={1}
          max={65535}
          value={serverAddress.port}
          aria-invalid={addressError}
          disabled={libraryLoading}
          onChange={(event) => setServerAddress({ port: event.target.value })}
        />
      </Field>
      <Field orientation="horizontal" className="w-full justify-between">
        <FieldLabel htmlFor="plex-server-ssl">
          {t('plexPage.serverSsl')}
        </FieldLabel>
        <Switch
          id="plex-server-ssl"
          checked={serverAddress.useSsl}
          onCheckedChange={(useSsl) => setServerAddress({ useSsl })}
          disabled={libraryLoading}
        />
      </Field>
      {addressError && (
        <p role="alert" className="text-destructive text-sm">
          {t('plexPage.invalidAddress')}
        </p>
      )}
    </>
  );
}

function DiscoveredServerField({
  selection,
}: {
  selection: ServerFieldsSelection;
}) {
  const { t } = useTranslation();
  const { state, serversQuery, setSelectedServerId } = selection;
  const { data: servers, isPending } = serversQuery;

  return (
    <Field>
      <FieldLabel id="plex-server-label">{t('plexPage.server')}</FieldLabel>
      <AbSelect
        aria-labelledby="plex-server-label"
        value={servers?.length ? state.selectedServerId : null}
        items={(servers ?? []).map((server) => ({
          value: server.id,
          label: server.name,
        }))}
        placeholder={
          isPending ? t('plexPage.loadingServers') : t('plexPage.chooseServer')
        }
        triggerClassName="w-full"
        disabled={isPending || state.libraryLoading}
        onValueChange={setSelectedServerId}
      />
    </Field>
  );
}

function LoadLibrariesButton({
  selection,
}: {
  selection: Pick<PlexLibrarySelection, 'state' | 'loadLibraries'>;
}) {
  const { t } = useTranslation();
  const { state, loadLibraries } = selection;
  const canLoad = state.customAddress || Boolean(state.selectedServerId);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={loadLibraries}
      disabled={state.libraryLoading || !canLoad}
    >
      {state.libraryLoading ? (
        <>
          <Spinner data-icon="inline-start" />
          {t('plexPage.loadingLibraries')}
        </>
      ) : (
        t('plexPage.loadLibraries')
      )}
    </Button>
  );
}

function PlexLibraryFields({
  selection,
}: {
  selection: LibraryFieldsSelection;
}) {
  const { t } = useTranslation();
  const { state, loaded, selectedLibrary, setSectionId, setPath } = selection;

  return (
    <>
      {state.libraryError && (
        <p role="alert" className="text-destructive text-sm">
          {getPlexErrorMessage(state.libraryError, t('plexPage.libraryError'))}
        </p>
      )}
      {loaded?.libraries.length === 0 && (
        <p role="status" className="text-muted-foreground text-sm">
          {t('plexPage.noLibraries')}
        </p>
      )}
      {loaded && loaded.libraries.length > 0 && (
        <>
          <Field>
            <FieldLabel id="plex-library-label">
              {t('plexPage.library')}
            </FieldLabel>
            <AbSelect
              aria-labelledby="plex-library-label"
              value={state.sectionId === null ? null : String(state.sectionId)}
              items={loaded.libraries.map((library) => ({
                value: String(library.id),
                label: library.title,
              }))}
              placeholder={t('plexPage.chooseLibrary')}
              triggerClassName="w-full"
              onValueChange={(value) => setSectionId(Number(value))}
            />
          </Field>
          <Field>
            <FieldLabel id="plex-path-label">
              {t('plexPage.location')}
            </FieldLabel>
            <AbSelect
              aria-labelledby="plex-path-label"
              value={state.path || null}
              items={(selectedLibrary?.paths ?? []).map((location) => ({
                value: location,
                label: location,
              }))}
              placeholder={t('plexPage.chooseLocation')}
              triggerClassName="w-full"
              disabled={!selectedLibrary || selectedLibrary.paths.length === 0}
              onValueChange={setPath}
            />
            {selectedLibrary && selectedLibrary.paths.length === 0 && (
              <FieldDescription>{t('plexPage.noLocations')}</FieldDescription>
            )}
          </Field>
        </>
      )}
    </>
  );
}
