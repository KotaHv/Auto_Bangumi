import {
  Clipboard,
  EllipsisVertical,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LogTailStatus } from '../live-tail';

interface LogMobileActionsMenuProps {
  onReset: () => void;
  onCopy: () => void;
  tailStatus?: LogTailStatus;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
}

export function LogMobileActionsMenu({
  onReset,
  onCopy,
  tailStatus,
  onPause,
  onResume,
  onRetry,
}: LogMobileActionsMenuProps) {
  const { t } = useTranslation();
  const tailRetry = tailStatus === 'error';
  const tailPaused = tailStatus === 'paused';
  const tailAction = tailRetry
    ? t('log.tail_retry')
    : tailPaused
      ? t('log.tail_resume')
      : t('log.tail_pause');
  const TailIcon = tailRetry ? RotateCcw : tailPaused ? Play : Pause;
  const onTailAction = tailRetry ? onRetry : tailPaused ? onResume : onPause;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('log.more_actions')}
            title={t('log.more_actions')}
          />
        }
      >
        <EllipsisVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-max"
      >
        <DropdownMenuItem onClick={onReset}>
          <RotateCcw />
          {t('log.reset')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopy}>
          <Clipboard />
          {t('log.copy')}
        </DropdownMenuItem>
        {tailStatus !== undefined && (
          <DropdownMenuItem onClick={onTailAction}>
            <TailIcon />
            {tailAction}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
