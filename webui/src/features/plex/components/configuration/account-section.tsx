import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, ExternalLink, Link2Off } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiPlex, type PlexConnection } from '../../api';
import { getPlexErrorMessage } from '../../errors';
import { plexKeys, plexMutationKeys } from '../../queries';
import type { usePlexAuth } from '../../use-plex-auth';

type PlexAuth = ReturnType<typeof usePlexAuth>;

interface PlexAccountSectionProps {
  connection: PlexConnection;
  auth?: PlexAuth;
}

export function PlexAccountSection({
  connection,
  auth,
}: PlexAccountSectionProps) {
  const { t } = useTranslation();
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const disconnectMutation = useMutation({
    mutationKey: plexMutationKeys.connectionWrite(),
    mutationFn: apiPlex.disconnect,
    onSuccess: async (result) => {
      await queryClient.cancelQueries({
        queryKey: plexKeys.connection(),
        exact: true,
      });
      queryClient.setQueryData(plexKeys.connection(), result);
      queryClient.resetQueries({
        queryKey: plexKeys.authStatus(),
        exact: true,
      });
      queryClient.removeQueries({ queryKey: plexKeys.servers() });
    },
  });
  const changeDisconnectConfirmation = (open: boolean) => {
    if (!disconnectMutation.isPending) setDisconnectConfirmOpen(open);
  };
  const confirmDisconnect = () => {
    setDisconnectConfirmOpen(false);
    disconnectMutation.mutate();
  };

  return (
    <section
      className="flex flex-col gap-3 px-5 py-4"
      aria-labelledby="plex-account-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="plex-account-heading"
          className="font-heading text-base leading-snug font-medium"
        >
          {t('plexPage.accountTitle')}
        </h2>
        {connection.connected ? (
          <Button
            variant="destructive"
            className="shrink-0"
            onClick={() => setDisconnectConfirmOpen(true)}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                {t('plexPage.disconnecting')}
              </>
            ) : (
              <>
                <Link2Off data-icon="inline-start" />
                {t('plexPage.disconnect')}
              </>
            )}
          </Button>
        ) : (
          auth && <PlexConnectButton auth={auth} />
        )}
      </div>
      <AbConfirm
        open={disconnectConfirmOpen}
        onOpenChange={changeDisconnectConfirmation}
        title={t('plexPage.disconnectConfirmTitle')}
        confirmType="warn"
        confirmText={t('plexPage.disconnect')}
        confirmLoading={disconnectMutation.isPending}
        onConfirm={confirmDisconnect}
      >
        {t('plexPage.disconnectConfirmDescription')}
      </AbConfirm>
      {auth && <PlexAuthorizationStatus auth={auth} />}
      {disconnectMutation.error && (
        <p role="alert" className="text-destructive text-sm">
          {getPlexErrorMessage(
            disconnectMutation.error,
            t('plexPage.disconnectError'),
          )}
        </p>
      )}
    </section>
  );
}

function PlexConnectButton({ auth }: { auth: PlexAuth }) {
  const { t } = useTranslation();
  const { state, startAuth } = auth;
  const isStarting = state.kind === 'starting';
  const canConnect = state.kind === 'idle' || state.kind === 'expired';

  return (
    <Button
      variant="brand"
      size="sm"
      className="shrink-0"
      onClick={startAuth}
      disabled={!canConnect}
    >
      {isStarting ? (
        <>
          <Spinner data-icon="inline-start" />
          {t('plexPage.starting')}
        </>
      ) : (
        <>
          <ExternalLink data-icon="inline-start" />
          {t('plexPage.connectAccount')}
        </>
      )}
    </Button>
  );
}

export function PlexAuthorizationStatus({ auth }: { auth: PlexAuth }) {
  const { t } = useTranslation();
  const { state, retryAuthorizationCheck } = auth;

  switch (state.kind) {
    case 'checking':
      return (
        <p role="status" className="text-muted-foreground text-sm">
          {t('plexPage.loading')}
        </p>
      );
    case 'expired':
      return (
        <Alert variant="destructive">
          <AlertDescription>{t('plexPage.expired')}</AlertDescription>
        </Alert>
      );
    case 'pending':
      return (
        <PlexAuthorizationPrompt url={state.url}>
          <span role="status" aria-live="polite">
            {t('plexPage.waiting')}
          </span>
        </PlexAuthorizationPrompt>
      );
    case 'error': {
      const errorContent = (
        <>
          <span className="text-destructive text-sm">
            {getPlexErrorMessage(state.error, t('plexPage.authError'))}
          </span>
          <Button variant="outline" size="sm" onClick={retryAuthorizationCheck}>
            {t('plexPage.retryAuthorizationCheck')}
          </Button>
        </>
      );

      if (state.url) {
        return (
          <PlexAuthorizationPrompt url={state.url}>
            {errorContent}
          </PlexAuthorizationPrompt>
        );
      }
      return (
        <div role="alert" className="flex flex-col items-start gap-2">
          {errorContent}
        </div>
      );
    }
    case 'idle':
    case 'starting':
    case 'completed':
      return null;
    default: {
      const unhandledState: never = state;
      throw new Error(`Unhandled Plex authorization state: ${unhandledState}`);
    }
  }
}

function PlexAuthorizationPrompt({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Alert>
      <ExternalLink aria-hidden="true" />
      <AlertTitle>{t('plexPage.authorizationPending')}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>{t('plexPage.openPlex')}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground inline-flex items-center gap-1 font-medium underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t('plexPage.openAuthorization')}{' '}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
        {children}
      </AlertDescription>
    </Alert>
  );
}
