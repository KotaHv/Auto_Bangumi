import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { message } from '@/lib/message';
import { copyText } from '@/lib/clipboard';

interface AbRssLinkProps {
  url: string;
  textClassName?: string;
}

export function AbRssLink({ url, textClassName }: AbRssLinkProps) {
  const { t } = useTranslation();

  async function copyRssLink() {
    if (await copyText(url)) {
      message.success(t('notify.copy_success'));
    } else {
      message.error(t('notify.copy_failed'));
    }
  }

  return (
    <div className="text-muted-foreground bg-muted/50 flex min-w-0 items-center gap-1 rounded-lg px-2 py-1">
      <span
        className={cn('min-w-0 flex-1 font-mono text-xs', textClassName)}
        title={url}
      >
        {url}
      </span>
      <button
        type="button"
        aria-label={t('notify.copy')}
        title={t('notify.copy')}
        className="text-brand/70 hover:text-brand focus-visible:ring-brand/40 flex size-7 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2"
        onClick={copyRssLink}
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}
