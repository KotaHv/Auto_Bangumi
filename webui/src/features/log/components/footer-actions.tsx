import type { ReactNode } from 'react';
import { Clipboard, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface LogFooterActionsProps {
  compact: boolean;
  onReset: () => void;
  onCopy: () => void;
  children?: ReactNode;
}

export function LogFooterActions({
  compact,
  onReset,
  onCopy,
  children,
}: LogFooterActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        aria-label={compact ? t('log.reset') : undefined}
        title={compact ? t('log.reset') : undefined}
        onClick={onReset}
      >
        <RotateCcw
          data-icon={compact ? undefined : 'inline-start'}
          className={compact ? 'size-3.5' : undefined}
        />
        {!compact && t('log.reset')}
      </Button>
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        aria-label={compact ? t('log.copy') : undefined}
        title={compact ? t('log.copy') : undefined}
        onClick={onCopy}
      >
        <Clipboard
          data-icon={compact ? undefined : 'inline-start'}
          className={compact ? 'size-3.5' : undefined}
        />
        {!compact && t('log.copy')}
      </Button>
      {children}
    </>
  );
}
