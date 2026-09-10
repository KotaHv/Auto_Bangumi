import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EllipsisVertical, MonitorPlay, UserRound } from 'lucide-react';
import { AbChangeAccount } from '@/features/auth/components/ab-change-account';
import { AbPlayerSettings } from '@/features/player/components/ab-player-settings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AbProgramControls } from './ab-program-controls';

export function AbTopbarMenu() {
  const { t } = useTranslation();
  const [openAccount, setOpenAccount] = useState(false);
  const [openPlayerSettings, setOpenPlayerSettings] = useState(false);

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

          <DropdownMenuItem onClick={() => setOpenPlayerSettings(true)}>
            <MonitorPlay />
            {t('player.settings_title')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setOpenAccount(true)}>
            <UserRound />
            {t('topbar.profile.title')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AbPlayerSettings
        open={openPlayerSettings}
        onOpenChange={setOpenPlayerSettings}
      />

      <AbChangeAccount open={openAccount} onOpenChange={setOpenAccount} />
    </>
  );
}
