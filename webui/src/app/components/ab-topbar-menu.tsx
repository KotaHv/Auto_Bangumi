import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EllipsisVertical, UserRound } from 'lucide-react';
import { AbChangeAccount } from '@/features/auth/components/ab-change-account';
import { AbRefreshPosterMenuItem } from '@/features/bangumi/components/ab-refresh-poster-menu-item';
import { AbProgramControls } from '@/features/program/components/ab-program-controls';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AbTopbarMenu() {
  const { t } = useTranslation();
  const [openAccount, setOpenAccount] = useState(false);

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
        </DropdownMenuContent>
      </DropdownMenu>

      <AbChangeAccount open={openAccount} onOpenChange={setOpenAccount} />
    </>
  );
}
