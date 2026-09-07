import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonitorPlay } from 'lucide-react';
import { AbPlayerSettings } from '@/components/player/ab-player-settings';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { usePlayerStore } from '@/store/player';

export default function PlayerPage() {
  const { t } = useTranslation();

  const url = usePlayerStore((s) => s.url);
  const type = usePlayerStore((s) => s.type);

  const [openSettings, setOpenSettings] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {type === 'iframe' && url !== '' ? (
        <iframe
          src={url}
          allowFullScreen
          className="h-full w-full flex-1 rounded-lg border"
        />
      ) : (
        <Empty className="flex-1">
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-2xl [&_svg:not([class*='size-'])]:size-6"
          >
            <MonitorPlay />
          </EmptyMedia>
          <EmptyTitle className="text-lg">{t('player.title')}</EmptyTitle>
          <EmptyDescription>{t('player.desc')}</EmptyDescription>
          <Button
            variant="brand"
            className="mt-1 px-4 py-2"
            onClick={() => setOpenSettings(true)}
          >
            {t('player.settings_title')}
          </Button>
        </Empty>
      )}

      <AbPlayerSettings open={openSettings} onOpenChange={setOpenSettings} />
    </div>
  );
}
