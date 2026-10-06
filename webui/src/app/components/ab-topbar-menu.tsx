import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { EllipsisVertical, Info, UserRound } from 'lucide-react';
import { AbChangeAccount } from '@/features/auth/components/ab-change-account';
import { AbRefreshPosterMenuItem } from '@/features/bangumi/components/ab-refresh-poster-menu-item';
import { AbProgramControls } from '@/features/program/components/ab-program-controls';
import { programStatusOptions } from '@/features/program/queries';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AbTopbarMenu() {
  const { t } = useTranslation();
  const [openAccount, setOpenAccount] = useState(false);
  const { data: status } = useQuery(programStatusOptions());
  const version = status?.version;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="menu"
              title="menu"
            />
          }
        >
          <EllipsisVertical />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={16} className="w-max">
          <AbProgramControls />
          <AbRefreshPosterMenuItem />

          <DropdownMenuItem onClick={() => setOpenAccount(true)}>
            <UserRound />
            {t('topbar.profile.title')}
          </DropdownMenuItem>

          {version && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="font-mono">
                <Info aria-hidden="true" />
                {version}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AbChangeAccount open={openAccount} onOpenChange={setOpenAccount} />
    </>
  );
}
