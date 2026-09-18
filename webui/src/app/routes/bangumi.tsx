import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ListX } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { AbLoadError } from '@/components/shared/ab-load-error';
import { AbBangumiCard } from '@/features/bangumi/components/ab-bangumi-card';
import { AbEditRule } from '@/features/bangumi/components/rule/ab-edit-rule';
import { bangumiListOptions } from '@/features/bangumi/queries';

export default function BangumiPage() {
  const { t } = useTranslation();
  const bangumiQuery = useQuery(bangumiListOptions());
  const [editRuleId, setEditRuleId] = useState<number>();

  if (bangumiQuery.isPending) {
    return (
      <Empty className="h-full min-h-0">
        <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>{t('bangumi.loading')}</EmptyTitle>
      </Empty>
    );
  }

  if (bangumiQuery.isLoadingError) {
    return (
      <AbLoadError
        title={t('bangumi.load_failed')}
        retryLabel={t('bangumi.retry')}
        onRetry={() => void bangumiQuery.refetch()}
      />
    );
  }

  const bangumi = bangumiQuery.data ?? [];
  const editRule = bangumi.find((rule) => rule.id === editRuleId);

  return (
    <div className="h-full grow overflow-auto p-6">
      {bangumi.length === 0 ? (
        <Empty className="h-full min-h-0 border-0 p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
              <ListX />
            </EmptyMedia>
            <EmptyTitle>{t('bangumi.empty')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {bangumi.map((i) => (
            <div key={i.id} className={i.deleted ? 'grayscale' : ''}>
              <AbBangumiCard
                bangumi={i}
                type="primary"
                onClick={() => setEditRuleId(i.id)}
              />
            </div>
          ))}
        </div>
      )}

      {editRule && (
        <AbEditRule
          key={editRule.id}
          rule={editRule}
          onClose={() => setEditRuleId(undefined)}
        />
      )}
    </div>
  );
}
