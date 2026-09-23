import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { CircleAlert, ChevronDown, Loader2 } from 'lucide-react';

interface LogHistoryListEndProps {
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore: () => void;
  layout: 'desktop' | 'mobile';
}

export function LogHistoryListEnd({
  hasMore,
  loadingMore,
  loadMoreFailed,
  onLoadMore,
  layout,
}: LogHistoryListEndProps) {
  const { t } = useTranslation();

  if (layout === 'mobile' && !hasMore) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-1 py-3">
      {hasMore ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : layout === 'mobile' ? (
            <ChevronDown data-icon="inline-start" />
          ) : null}
          {loadMoreFailed ? t('log.load_earlier_retry') : t('log.load_earlier')}
        </Button>
      ) : (
        <span className="text-muted-foreground text-xs">
          {t('log.no_more')}
        </span>
      )}
      {loadMoreFailed && (
        <span className="text-destructive flex items-center gap-1 text-xs">
          <CircleAlert className="size-3.5" />
          {t('log.load_earlier_failed')}
        </span>
      )}
    </div>
  );
}
