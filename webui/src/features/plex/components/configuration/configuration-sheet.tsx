import type { ReactNode } from 'react';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { plexMutationKeys } from '../../queries';

const connectionMutations = {
  mutationKey: plexMutationKeys.connectionWrite(),
  exact: true,
};

export function PlexConfigurationSheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const busy = useIsMutating(connectionMutations) > 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && queryClient.isMutating(connectionMutations) > 0) {
          eventDetails.cancel();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent
        showCloseButton={!busy}
        className="w-full gap-0 p-0 max-sm:data-[side=right]:w-full sm:max-w-lg"
      >
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle>{t('plexPage.configureTitle')}</SheetTitle>
          <SheetDescription>
            {t('plexPage.configureDescription')}
          </SheetDescription>
          <p role="status" className="sr-only">
            {busy ? t('plexPage.updating') : ''}
          </p>
        </SheetHeader>
        <div
          inert={busy}
          aria-busy={busy}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-2"
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
