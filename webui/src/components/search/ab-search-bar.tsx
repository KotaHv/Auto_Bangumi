import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AbSearch } from './ab-search';
import { AbBangumiCard } from '@/components/bangumi/ab-bangumi-card';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { searchProviderOptions } from '@/query/options';
import { useSearchSSE } from '@/hooks/use-search-sse';
import type { BangumiRule } from '@/types/bangumi';

interface AbSearchBarProps {
  onAddBangumi: (bangumiRule: BangumiRule) => void;
  className?: string;
}

export function AbSearchBar({ onAddBangumi, className }: AbSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [provider, setProvider] = useState('mikan');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const { data: providers = [] } = useQuery(searchProviderOptions());
  const { bangumiList, loading } = useSearchSSE(
    inputValue,
    provider,
    searchTrigger,
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false);
      setInputValue('');
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
          onSearch={() => setSearchTrigger((value) => value + 1)}
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
