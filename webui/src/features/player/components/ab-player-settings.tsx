import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbSelect } from '@/components/shared/ab-select';
import { AbPopup } from '@/components/shared/ab-popup';
import { Input } from '@/components/ui/input';
import { usePlayerStore, type MediaPlayerType } from '../model/store';

interface AbPlayerSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbPlayerSettings({
  open,
  onOpenChange,
}: AbPlayerSettingsProps) {
  const { t } = useTranslation();

  const type = usePlayerStore((s) => s.type);
  const url = usePlayerStore((s) => s.url);
  const setType = usePlayerStore((s) => s.setType);
  const setUrl = usePlayerStore((s) => s.setUrl);

  const [draftType, setDraftType] = useState<MediaPlayerType>(type);
  const [draftUrl, setDraftUrl] = useState(url);

  useEffect(() => {
    if (open) {
      setDraftType(type);
      setDraftUrl(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function apply() {
    setType(draftType);
    setUrl(draftUrl);
    onOpenChange(false);
  }

  return (
    <AbPopup
      title={t('player.settings_title')}
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
    >
      <div className="flex flex-col gap-4">
        <AbSelect
          value={draftType}
          items={[
            { value: 'jump', label: 'jump' },
            { value: 'iframe', label: 'iframe' },
          ]}
          triggerClassName="w-full"
          onValueChange={(value) => setDraftType(value as MediaPlayerType)}
        />
        <Input
          className="w-full px-2"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          type="text"
          placeholder={t('player.url_placeholder')}
        />
        {draftType === 'jump' && (
          <p className="text-muted-foreground text-center text-xs">
            {t('player.jump_hint')}
          </p>
        )}
        <p className="text-muted-foreground text-xs">{t('player.edit_hint')}</p>
        <Button variant="brand" className="w-full" onClick={apply}>
          {t('player.apply_btn')}
        </Button>
      </div>
    </AbPopup>
  );
}
