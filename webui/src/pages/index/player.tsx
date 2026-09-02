import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonitorPlay } from 'lucide-react';
import { AbButton } from '@/components/basic/ab-button';
import { AbPlayerSettings } from '@/components/ab-player-settings';
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

  const [showSettings, setShowSettings] = useState(false);

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
          <AbButton
            type="brand"
            className="mt-1"
            onClick={() => setShowSettings(true)}
          >
            {t('player.settings_title')}
          </AbButton>
        </Empty>
      )}

      <AbPlayerSettings show={showSettings} onShowChange={setShowSettings} />
    </div>
  );
}
