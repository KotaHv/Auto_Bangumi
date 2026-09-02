import { useEffect, useState } from 'react';
import { AbSearch } from './basic/ab-search';
import { AbBangumiCard } from './ab-bangumi-card';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store/search';
import type { BangumiRule } from '#/bangumi';

interface AbSearchBarProps {
  onAddBangumi: (bangumiRule: BangumiRule) => void;
  className?: string;
}

export function AbSearchBar({ onAddBangumi, className }: AbSearchBarProps) {
  const [open, setOpen] = useState(false);

  const {
    providers,
    provider,
    loading,
    inputValue,
    bangumiList,
    setInputValue,
    setProvider,
    getProviders,
    onSearch,
    clearSearch,
  } = useSearchStore();

  useEffect(() => {
    getProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false);
      clearSearch();
    } else {
      setOpen(true);
    }
  }

  return (
    <div className={cn('w-90 max-w-full', className)}>
      <Popover
        open={open || bangumiList.length > 0}
        onOpenChange={handleOpenChange}
      >
        <AbSearch
          providers={providers}
          provider={provider}
          loading={loading}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSearch={onSearch}
          onSelectProvider={setProvider}
        />

        <PopoverContent
          className="w-120 max-w-[92vw] space-y-2 p-2"
          align="start"
          side="bottom"
          sideOffset={8}
        >
          {bangumiList.map((bangumi) => (
            <AbBangumiCard
              key={bangumi.order}
              bangumi={bangumi.value}
              type="search"
              onClick={() => onAddBangumi(bangumi.value)}
            />
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
