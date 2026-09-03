import { useEffect } from 'react';
import { AbBangumiCard } from '@/components/ab-bangumi-card';
import { AbEditRule } from '@/components/ab-edit-rule';
import { useBangumiStore } from '@/store/bangumi';

export default function BangumiPage() {
  const bangumi = useBangumiStore((s) => s.bangumi);
  const getAll = useBangumiStore((s) => s.getAll);
  const openEditPopup = useBangumiStore((s) => s.openEditPopup);

  useEffect(() => {
    getAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full grow overflow-auto p-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {bangumi?.map((i) => (
          <div key={i.id} className={i.deleted ? 'grayscale' : ''}>
            <AbBangumiCard
              bangumi={i}
              type="primary"
              onClick={() => openEditPopup(i)}
            />
          </div>
        ))}
      </div>

      <AbEditRule />
    </div>
  );
}
