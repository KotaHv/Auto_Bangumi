import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbButton } from '@/components/basic/ab-button';
import { AbSelect } from '@/components/basic/ab-select';
import { AbPopup } from '@/components/ab-popup';
import { AbInput } from '@/components/basic/ab-input';
import { usePlayerStore, type MediaPlayerType } from '@/store/player';

interface AbPlayerSettingsProps {
  show: boolean;
  onShowChange: (show: boolean) => void;
}

export function AbPlayerSettings({
  show,
  onShowChange,
}: AbPlayerSettingsProps) {
  const { t } = useTranslation();

  const type = usePlayerStore((s) => s.type);
  const url = usePlayerStore((s) => s.url);
  const setType = usePlayerStore((s) => s.setType);
  const setUrl = usePlayerStore((s) => s.setUrl);

  const [draftType, setDraftType] = useState<MediaPlayerType>(type);
  const [draftUrl, setDraftUrl] = useState(url);

  useEffect(() => {
    if (show) {
      setDraftType(type);
      setDraftUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function apply() {
    setType(draftType);
    setUrl(draftUrl);
    onShowChange(false);
  }

  return (
    <AbPopup
      title={t('player.settings_title')}
      show={show}
      onShowChange={onShowChange}
      width="lg"
    >
      <div className="flex flex-col gap-4">
        <AbSelect
          value={draftType}
          items={['jump', 'iframe']}
          className="w-full"
          onChange={(v) => setDraftType(v as MediaPlayerType)}
        />
        <AbInput
          variant="default"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          type="text"
          placeholder={t('player.url_placeholder')}
          className="w-full"
        />
        {draftType === 'jump' && (
          <p className="text-muted-foreground text-center text-xs">
            {t('player.jump_hint')}
          </p>
        )}
        <p className="text-muted-foreground text-xs">{t('player.edit_hint')}</p>
        <AbButton type="brand" className="w-full" onClick={apply}>
          {t('player.apply_btn')}
        </AbButton>
      </div>
    </AbPopup>
  );
}
