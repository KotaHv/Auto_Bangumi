import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <section className="w-full max-w-sm text-center">
        <div className="bg-muted text-foreground mx-auto flex size-12 items-center justify-center rounded-2xl [&_svg:not([class*='size-'])]:size-6">
          <FileQuestion />
        </div>
        <p className="text-brand font-display mt-4 text-sm font-semibold tracking-[0.2em] uppercase">
          404
        </p>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
          {t('not_found.title')}
        </h1>
        <Link
          to="/bangumi"
          className={buttonVariants({ variant: 'brand', className: 'mt-6' })}
        >
          {t('not_found.return_home')}
        </Link>
      </section>
    </div>
  );
}
