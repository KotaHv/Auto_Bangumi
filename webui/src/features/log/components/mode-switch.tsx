import { History, Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';

type LogMode = 'history' | 'tail';

interface LogModeSwitchProps {
  value: LogMode;
  onChange: (mode: LogMode) => void;
  fullWidth?: boolean;
  compactLabels?: boolean;
}

export function LogModeSwitch({
  value,
  onChange,
  fullWidth = false,
  compactLabels = false,
}: LogModeSwitchProps) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('log.mode')}
      className={cn(
        'bg-muted inline-flex h-8 items-center gap-0.5 rounded-lg p-0.5',
        fullWidth ? 'min-w-0 flex-1' : 'shrink-0',
      )}
    >
      <Button
        type="button"
        variant={value === 'history' ? 'brand' : 'ghost'}
        size="xs"
        className={fullWidth ? 'flex-1' : undefined}
        aria-pressed={value === 'history'}
        onClick={() => onChange('history')}
      >
        <History data-icon="inline-start" />
        {t(compactLabels ? 'log.history_short' : 'log.history')}
      </Button>
      <Button
        type="button"
        variant={value === 'tail' ? 'brand' : 'ghost'}
        size="xs"
        className={fullWidth ? 'flex-1' : undefined}
        aria-pressed={value === 'tail'}
        onClick={() => onChange('tail')}
      >
        <Radio data-icon="inline-start" />
        {t(compactLabels ? 'log.live_tail_short' : 'log.live_tail')}
      </Button>
    </div>
  );
}
