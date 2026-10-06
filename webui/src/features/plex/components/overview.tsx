import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { message } from '@/lib/message';
import { apiPlex, type PlexConnection } from '../api';
import { getPlexErrorMessage } from '../errors';
import { plexConnectionOptions, plexKeys } from '../queries';
import { usePlexAuth } from '../use-plex-auth';
import {
  PlexAccountSection,
  PlexAuthorizationStatus,
} from './configuration/account-section';
import { PlexConfigurationSheet } from './configuration/configuration-sheet';
import { PlexLibrarySection } from './configuration/library-section';

interface PlexConnectionErrorAlertProps {
  error: unknown;
  isFetching: boolean;
  onRetry: () => void;
}

interface PlexAutoRefreshControl {
  setupIncomplete: boolean;
  isPending: boolean;
  hasError: boolean;
  error: unknown;
  onChange: (enabled: boolean) => void;
}

interface PlexLibraryRefreshAction {
  available: boolean;
  isPending: boolean;
  onRefresh: () => void;
}

interface PlexOverviewCardProps {
  connection: PlexConnection;
  isConfigured: boolean;
  serverHost: string | null;
  connectionError: PlexConnectionErrorAlertProps | null;
  autoRefresh: PlexAutoRefreshControl;
  libraryRefresh: PlexLibraryRefreshAction;
  onConfigure: () => void;
}

interface PlexOverviewCardDetailsProps {
  connection: PlexConnection;
  isConfigured: boolean;
  serverHost: string | null;
  autoRefresh: PlexAutoRefreshControl;
}

interface PlexAutoRefreshRowProps {
  connection: PlexConnection;
  isConfigured: boolean;
  autoRefresh: PlexAutoRefreshControl;
}

interface PlexConnectionSummaryProps {
  connection: PlexConnection;
  isConfigured: boolean;
  serverHost: string | null;
}

interface PlexOverviewActionsProps {
  connection: PlexConnection;
  isConfigured: boolean;
  libraryRefresh: PlexLibraryRefreshAction;
  onConfigure: () => void;
}

interface PlexOverviewContentProps {
  connection: PlexConnection;
  connectionError: PlexConnectionErrorAlertProps | null;
}

interface PlexOverviewContentStateProps extends PlexOverviewContentProps {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  autoRefresh: PlexAutoRefreshControl;
  libraryRefresh: PlexLibraryRefreshAction;
}

interface PlexOverviewBodyProps extends PlexOverviewContentProps {
  autoRefresh: PlexAutoRefreshControl;
  libraryRefresh: PlexLibraryRefreshAction;
  onConfigure: () => void;
}

interface PlexOverviewConfigurationProps extends PlexOverviewContentProps {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  auth?: ReturnType<typeof usePlexAuth>;
}

export function PlexOverview() {
  const connectionQuery = useQuery(plexConnectionOptions());
  const connection = connectionQuery.data;
  const retryConnection = () => {
    void connectionQuery.refetch({ cancelRefetch: false });
  };

  if (connectionQuery.isPending) {
    return <PlexOverviewLoading />;
  }

  if (!connection && connectionQuery.isError) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6">
        <PlexConnectionErrorAlert
          error={connectionQuery.error}
          isFetching={connectionQuery.isFetching}
          onRetry={retryConnection}
        />
      </div>
    );
  }

  if (!connection) return null;

  const connectionError = connectionQuery.isError
    ? {
        error: connectionQuery.error,
        isFetching: connectionQuery.isFetching,
        onRetry: retryConnection,
      }
    : null;

  return (
    <PlexOverviewContent
      connection={connection}
      connectionError={connectionError}
    />
  );
}

function PlexOverviewContent({
  connection,
  connectionError,
}: PlexOverviewContentProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const refreshMutation = useMutation({
    mutationFn: apiPlex.refreshLibrary,
    onSuccess: () =>
      message.success(t('plexPage.refreshSent'), { timeout: 3000 }),
    onError: (error) => {
      message.error(t('plexPage.refreshError'), {
        description: getPlexErrorMessage(
          error,
          t('plexPage.refreshFailureAdvice'),
        ),
        timeout: 15000,
        priority: 'high',
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: plexKeys.connection() }),
  });
  const enabledMutation = useMutation({
    mutationFn: apiPlex.setEnabled,
    onSuccess: async (result) => {
      await queryClient.cancelQueries({
        queryKey: plexKeys.connection(),
        exact: true,
      });
      queryClient.setQueryData(plexKeys.connection(), result);
    },
  });
  const isConfigured = isPlexConfigured(connection);
  const props: PlexOverviewContentStateProps = {
    connection,
    connectionError,
    sheetOpen,
    setSheetOpen,
    autoRefresh: {
      setupIncomplete: !isConfigured,
      isPending: enabledMutation.isPending,
      hasError: enabledMutation.isError,
      error: enabledMutation.error,
      onChange: (enabled: boolean) => enabledMutation.mutate(enabled),
    },
    libraryRefresh: {
      available: isConfigured,
      isPending: refreshMutation.isPending,
      onRefresh: () => refreshMutation.mutate(),
    },
  };

  if (connection.account_reauth_required) {
    return (
      <PlexOverviewBody
        connection={connection}
        connectionError={connectionError}
        autoRefresh={props.autoRefresh}
        libraryRefresh={props.libraryRefresh}
        onConfigure={() => setSheetOpen(true)}
      />
    );
  }

  if (connection.connected) return <PlexConnectedOverviewBody {...props} />;
  return <PlexAuthOverviewBody {...props} />;
}

function PlexConnectedOverviewBody(props: PlexOverviewContentStateProps) {
  const { connection, connectionError, sheetOpen, setSheetOpen } = props;

  return (
    <>
      <PlexOverviewBody
        connection={connection}
        connectionError={connectionError}
        autoRefresh={props.autoRefresh}
        libraryRefresh={props.libraryRefresh}
        onConfigure={() => setSheetOpen(true)}
      />
      <PlexOverviewConfiguration
        connection={connection}
        connectionError={connectionError}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
      />
    </>
  );
}

function PlexAuthOverviewBody(props: PlexOverviewContentStateProps) {
  const auth = usePlexAuth();
  const { connection, connectionError, sheetOpen, setSheetOpen } = props;
  const openConfiguration = () => {
    if (auth.state.kind !== 'pending' && !auth.isStarting) {
      void auth.startAuth();
    }
    setSheetOpen(true);
  };

  return (
    <>
      <PlexOverviewBody
        connection={connection}
        connectionError={connectionError}
        autoRefresh={props.autoRefresh}
        libraryRefresh={props.libraryRefresh}
        onConfigure={openConfiguration}
      />
      <PlexOverviewConfiguration
        connection={connection}
        connectionError={connectionError}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        auth={auth}
      />
    </>
  );
}

function PlexOverviewConfiguration({
  connection,
  connectionError,
  sheetOpen,
  setSheetOpen,
  auth,
}: PlexOverviewConfigurationProps) {
  return (
    <PlexConfigurationSheet open={sheetOpen} onOpenChange={setSheetOpen}>
      {connectionError && <PlexConnectionErrorAlert {...connectionError} />}
      <PlexAccountSection connection={connection} auth={auth} />
      {connection.connected && (
        <>
          <Separator />
          <PlexLibrarySection
            key={JSON.stringify([
              connection.connected,
              connection.url,
              connection.server_identifier,
              connection.section_id,
              connection.path,
            ])}
            connection={connection}
            onSaved={() => setSheetOpen(false)}
          />
        </>
      )}
    </PlexConfigurationSheet>
  );
}

function PlexOverviewBody({
  connection,
  connectionError,
  autoRefresh,
  libraryRefresh,
  onConfigure,
}: PlexOverviewBodyProps) {
  return (
    <div className="px-6 py-5">
      <PlexOverviewCard
        connection={connection}
        isConfigured={isPlexConfigured(connection)}
        serverHost={getPlexServerHost(connection.url)}
        connectionError={connectionError}
        autoRefresh={autoRefresh}
        libraryRefresh={libraryRefresh}
        onConfigure={onConfigure}
      />
    </div>
  );
}

function PlexOverviewLoading() {
  const { t } = useTranslation();

  return (
    <div
      className="flex h-full items-center justify-center"
      role="status"
      aria-label={t('plexPage.loading')}
    >
      <Spinner className="size-5" />
    </div>
  );
}

function PlexConnectionErrorAlert({
  error,
  isFetching,
  onRetry,
}: PlexConnectionErrorAlertProps) {
  const { t } = useTranslation();

  return (
    <Alert variant="destructive" className="mx-auto max-w-4xl">
      <AlertTitle>{t('plexPage.connectionErrorTitle')}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{getPlexErrorMessage(error, t('plexPage.connectionError'))}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={onRetry}
        >
          {isFetching ? (
            <>
              <Spinner data-icon="inline-start" />
              {t('plexPage.loading')}
            </>
          ) : (
            t('plexPage.retry')
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PlexOverviewCard({
  connection,
  isConfigured,
  serverHost,
  connectionError,
  autoRefresh,
  libraryRefresh,
  onConfigure,
}: PlexOverviewCardProps) {
  const { t } = useTranslation();
  const details = { connection, isConfigured, serverHost, autoRefresh };

  return (
    <section
      aria-labelledby="plex-heading"
      className="mx-auto w-full max-w-4xl"
    >
      <h1
        id="plex-heading"
        className="text-brand mb-3 pl-4 font-sans text-lg font-semibold select-text sm:text-xl"
      >
        {t('plexPage.title')}
      </h1>
      {connectionError && <PlexConnectionErrorAlert {...connectionError} />}
      <Card className="border-border overflow-hidden rounded-2xl [--card-spacing:0px]">
        {connection.account_reauth_required ? (
          <PlexReauthorizationCardContent {...details} />
        ) : (
          <>
            <CardContent className="px-4 py-2">
              <PlexOverviewCardDetails {...details} />
            </CardContent>
            <CardFooter className="border-border/70 bg-muted/30 flex-col items-stretch gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
              <PlexOverviewActions
                connection={connection}
                isConfigured={isConfigured}
                libraryRefresh={libraryRefresh}
                onConfigure={onConfigure}
              />
            </CardFooter>
          </>
        )}
      </Card>
    </section>
  );
}

function PlexReauthorizationCardContent(props: PlexOverviewCardDetailsProps) {
  const auth = usePlexAuth();

  return (
    <>
      <CardContent className="px-4 py-2">
        <PlexOverviewCardDetails {...props} />
        <PlexAuthorizationStatus auth={auth} />
      </CardContent>
      <CardFooter className="border-border/70 bg-muted/30 flex-col items-stretch gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
        <PlexReauthorizationAction auth={auth} />
      </CardFooter>
    </>
  );
}

function PlexOverviewCardDetails({
  connection,
  isConfigured,
  serverHost,
  autoRefresh,
}: PlexOverviewCardDetailsProps) {
  return (
    <>
      <PlexAutoRefreshRow
        connection={connection}
        isConfigured={isConfigured}
        autoRefresh={autoRefresh}
      />
      <Separator />
      <PlexConnectionSummary
        connection={connection}
        isConfigured={isConfigured}
        serverHost={serverHost}
      />
    </>
  );
}

function PlexAutoRefreshRow({
  connection,
  isConfigured,
  autoRefresh,
}: PlexAutoRefreshRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <FieldLabel htmlFor="plex-enabled" className="text-sm">
          {t('plexPage.autoRefresh')}
        </FieldLabel>
        {connection.enabled && autoRefresh.setupIncomplete && (
          <p
            id="plex-enable-hint"
            className="text-muted-foreground mt-1 text-xs"
          >
            {t('plexPage.enableIncomplete')}
          </p>
        )}
        {autoRefresh.hasError && (
          <p role="alert" className="text-destructive mt-1 text-sm">
            {getPlexErrorMessage(autoRefresh.error, t('plexPage.enableError'))}
          </p>
        )}
      </div>
      <Switch
        id="plex-enabled"
        checked={connection.enabled}
        aria-describedby={
          connection.enabled && autoRefresh.setupIncomplete
            ? 'plex-enable-hint'
            : undefined
        }
        onCheckedChange={autoRefresh.onChange}
        disabled={
          connection.account_reauth_required ||
          autoRefresh.isPending ||
          (!isConfigured && !connection.enabled)
        }
      />
    </div>
  );
}

function PlexConnectionSummary({
  connection,
  isConfigured,
  serverHost,
}: PlexConnectionSummaryProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-3">
        <p className="text-sm font-medium">{t('plexPage.accountTitle')}</p>
        <p className="text-sm">
          {t(
            connection.account_reauth_required
              ? 'plexPage.accountReauthRequired'
              : connection.connected
                ? 'plexPage.accountConnected'
                : 'plexPage.accountDisconnected',
          )}
        </p>
      </div>
      <Separator />
      <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <p className="text-sm font-medium">{t('plexPage.libraryLocation')}</p>
        <div className="min-w-0 sm:text-right">
          {isConfigured ? (
            <p className="font-mono text-sm break-all">{connection.path}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t('plexPage.libraryNotConfigured')}
            </p>
          )}
          {serverHost && (
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs sm:justify-end">
              <Server className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{serverHost}</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function PlexReauthorizationAction({
  auth,
}: {
  auth: ReturnType<typeof usePlexAuth>;
}) {
  const { t } = useTranslation();
  const authState = auth.state.kind;
  let label = t('plexPage.reauthorize');
  let isBusy = false;
  let onAction = () => {
    void auth.startAuth();
  };

  switch (authState) {
    case 'starting':
      label = t('plexPage.starting');
      isBusy = true;
      break;
    case 'checking':
      label = t('plexPage.loading');
      isBusy = true;
      break;
    case 'pending':
      label = t('plexPage.waiting');
      isBusy = true;
      break;
    case 'completed':
      label = t('plexPage.updating');
      isBusy = true;
      break;
    case 'error':
      label = t('plexPage.retryAuthorizationCheck');
      onAction = auth.retryAuthorizationCheck;
      break;
    case 'idle':
    case 'expired':
      break;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
      <Button variant="brand" disabled={isBusy} onClick={onAction}>
        {isBusy && <Spinner data-icon="inline-start" />}
        {label}
      </Button>
    </div>
  );
}

function PlexOverviewActions({
  connection,
  isConfigured,
  libraryRefresh,
  onConfigure,
}: PlexOverviewActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
      {libraryRefresh.available && (
        <Button
          variant="outline"
          disabled={libraryRefresh.isPending}
          onClick={libraryRefresh.onRefresh}
        >
          {libraryRefresh.isPending ? (
            <>
              <Spinner data-icon="inline-start" />
              {t('plexPage.refreshing')}
            </>
          ) : (
            t('plexPage.refreshLibrary')
          )}
        </Button>
      )}
      <Button variant="brand" onClick={onConfigure}>
        {t(
          isConfigured
            ? 'plexPage.configure'
            : connection.connected
              ? 'plexPage.chooseLibraryAction'
              : 'plexPage.connectAccount',
        )}
      </Button>
    </div>
  );
}

function isPlexConfigured(connection: PlexConnection): boolean {
  return Boolean(
    connection.connected &&
    connection.url &&
    connection.section_id !== null &&
    connection.path,
  );
}

function getPlexServerHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
