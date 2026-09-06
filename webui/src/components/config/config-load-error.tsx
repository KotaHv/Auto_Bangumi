import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useTranslation } from 'react-i18next';
import { CircleAlert } from 'lucide-react';

export function ConfigLoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <Empty className="h-full min-h-0">
      <EmptyMedia
        variant="icon"
        className="text-destructive size-12 rounded-2xl [&_svg:not([class*='size-'])]:size-6"
      >
        <CircleAlert />
      </EmptyMedia>
      <EmptyTitle className="text-lg">
        {t('config.load_failed_title')}
      </EmptyTitle>
      <EmptyDescription className="w-full max-w-sm text-center">
        {t('config.load_failed')}
      </EmptyDescription>
      <Button variant="brand" className="mt-1 px-4 py-2" onClick={onRetry}>
        {t('config.retry')}
      </Button>
    </Empty>
  );
}
