import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AbBangumiCard } from '@/components/bangumi/ab-bangumi-card';
import { AbEditRule } from '@/components/bangumi/rule/ab-edit-rule';
import { bangumiListOptions } from '@/query/options';

export default function BangumiPage() {
  const { data: bangumi } = useQuery(bangumiListOptions());
  const [editRuleId, setEditRuleId] = useState<number>();
  const editRule = bangumi?.find((rule) => rule.id === editRuleId);

  return (
    <div className="h-full grow overflow-auto p-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {bangumi?.map((i) => (
          <div key={i.id} className={i.deleted ? 'grayscale' : ''}>
            <AbBangumiCard
              bangumi={i}
              type="primary"
              onClick={() => setEditRuleId(i.id)}
            />
          </div>
        ))}
      </div>

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
