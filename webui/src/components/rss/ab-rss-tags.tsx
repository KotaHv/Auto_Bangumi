import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RSS } from '@/types/rss';

interface AbRssTagsProps {
  rss: RSS;
  className?: string;
}

export function AbRssTags({ rss, className }: AbRssTagsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}
    >
      {rss.parser && <Badge variant="primary">{rss.parser}</Badge>}
      {rss.aggregate && <Badge variant="primary">{t('rss.aggregate')}</Badge>}
      {rss.enabled ? (
        <Badge variant="active">active</Badge>
      ) : (
        <Badge variant="inactive">inactive</Badge>
      )}
    </div>
  );
}
