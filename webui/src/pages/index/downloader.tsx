import { useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useConfigStore } from '@/store/config';

export default function DownloaderPage() {
  const { t } = useTranslation();

  const config = useConfigStore((s) => s.config);
  const getConfig = useConfigStore((s) => s.getConfig);

  const isNull = config.downloader.host === '';

  const host = config.downloader.host.replace(/http(s?)\:\/\//, '');
  const protocol = config.downloader.ssl ? 'https' : 'http';
  const url = `${protocol}://${host}`;

  useEffect(() => {
    getConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      {isNull ? (
        <Empty className="flex-1">
          <EmptyTitle className="text-brand text-xl">
            {t('downloader.hit')}
          </EmptyTitle>
          <EmptyDescription>
            <Link to="/config" className="underline underline-offset-4">
              {t('config.title')}
            </Link>
          </EmptyDescription>
        </Empty>
      ) : (
        <iframe
          src={url}
          allowFullScreen
          className="h-full w-full flex-1 rounded-lg border"
        />
      )}
    </div>
  );
}
