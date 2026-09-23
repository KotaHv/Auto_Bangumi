import { ArrowDown, Pause, Play, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from 'cn';
import type { LogTailStatus } from '../live-tail';

interface LogTailControlsProps {
  status: LogTailStatus;
  compact: boolean;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
}

export function LogTailStatusIndicator({ status }: { status: LogTailStatus }) {
  const { t } = useTranslation();
  const label =
    status === 'error'
      ? t('log.tail_error')
      : status === 'paused'
        ? t('log.tail_paused')
        : status === 'idle'
          ? t('log.tail_idle')
          : status === 'connected'
            ? t('log.tail_connected')
            : t('log.tail_connecting');
  const indicatorClass =
    status === 'error'
      ? 'bg-destructive'
      : status === 'paused' || status === 'idle'
        ? 'bg-muted-foreground'
        : status === 'connected'
          ? 'bg-brand animate-pulse'
          : 'bg-amber-500 animate-pulse';

  return (
    <span
      role="status"
      aria-label={label}
      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
    >
      <span
        aria-hidden="true"
        className={cn('size-2 shrink-0 rounded-full', indicatorClass)}
      />
    </span>
  );
}

export function LogTailControls({
  status,
  compact,
  onPause,
  onResume,
  onRetry,
}: LogTailControlsProps) {
  const { t } = useTranslation();
  const isRetry = status === 'error';
  const isResume = status === 'paused';
  const label = isRetry
    ? t('log.tail_retry')
    : isResume
      ? t('log.tail_resume')
      : t('log.tail_pause');
  const onClick = isRetry ? onRetry : isResume ? onResume : onPause;
  const Icon = isRetry ? RotateCcw : isResume ? Play : Pause;

  return (
    <Button
      variant="ghost"
      size={compact ? 'icon' : 'sm'}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      onClick={onClick}
    >
      <Icon
        data-icon={compact ? undefined : 'inline-start'}
        className={compact ? 'size-3.5' : undefined}
      />
      {!compact && label}
    </Button>
  );
}

export function LogTailNewEntries({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
      onClick={onClick}
    >
      <ArrowDown data-icon="inline-start" />
      {t('log.tail_new_entries', { count: String(count) })}
    </Button>
  );
}
