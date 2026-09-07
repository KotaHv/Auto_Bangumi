import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AbSearch } from './ab-search';
import { AbBangumiCard } from '@/components/bangumi/ab-bangumi-card';
import { cn } from '@/lib/utils';
import { searchProviderOptions } from '@/query/options';
import { useSearchSSE } from '@/hooks/use-search-sse';
import type { BangumiRule } from '@/types/bangumi';

interface AbSearchBarProps {
  onAddBangumi: (bangumiRule: BangumiRule) => void;
  className?: string;
}

export function AbSearchBar({ onAddBangumi, className }: AbSearchBarProps) {
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [provider, setProvider] = useState('mikan');
  const { data: providers = [] } = useQuery(searchProviderOptions());
  const { bangumiList, loading, searchKeyword, searchProvider, search } =
    useSearchSSE();
  const resultsOpen =
    open &&
    inputValue === searchKeyword &&
    provider === searchProvider &&
    bangumiList.length > 0;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!searchBarRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  function handleClear() {
    setInputValue('');
    search('', provider, 'immediate');
    setOpen(false);
  }

  function handleSearch() {
    if (!inputValue) {
      handleClear();
      return;
    }

    search(inputValue, provider, 'immediate');
    setOpen(true);
  }

  return (
    <div
      ref={searchBarRef}
      className={cn('relative w-90 max-w-full', className)}
    >
      <AbSearch
        providers={providers}
        provider={provider}
        loading={loading}
        inputValue={inputValue}
        onInputChange={(value) => {
          setInputValue(value);
          search(value, provider, 'auto');
          setOpen(Boolean(value));
        }}
        onInputFocus={() => setOpen(true)}
        onClear={handleClear}
        onSearch={handleSearch}
        onSelectProvider={(value) => {
          setProvider(value);
          if (!inputValue) {
            setOpen(false);
            return;
          }

          search(inputValue, value, 'immediate');
          setOpen(true);
        }}
      />

      {resultsOpen && (
        <div className="absolute top-full left-0 z-50 mt-8 flex flex-col gap-2 overflow-y-auto overscroll-contain md:mt-5">
          {bangumiList.map((bangumi) => (
            <AbBangumiCard
              key={bangumi.order}
              bangumi={bangumi.value}
              type="search"
              onClick={() => {
                setOpen(false);
                onAddBangumi(bangumi.value);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
