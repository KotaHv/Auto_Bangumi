import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AbSearch } from './ab-search';
import { AbBangumiCard } from '@/components/bangumi/ab-bangumi-card';
import { AbBangumiReview } from '@/components/bangumi/ab-bangumi-review';
import { AbPopup } from '@/components/common/ab-popup';
import { cn } from '@/lib/utils';
import { searchProviderOptions } from '@/query/options';
import { useSearchSSE } from '@/hooks/use-search-sse';
import type { SearchResult } from '@/types/search';

interface AbSearchBarProps {
  className?: string;
}

export function AbSearchBar({ className }: AbSearchBarProps) {
  const searchBarRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null,
  );
  const [reviewOpen, setReviewOpen] = useState(false);

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

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setSelectedResult(result);
    setReviewOpen(true);
  }

  function closeReview() {
    setReviewOpen(false);
  }

  return (
    <>
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
                bangumi={bangumi.value.bangumi}
                type="search"
                onClick={() => handleSelect(bangumi.value)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedResult && (
        <AbPopup
          title={t('homepage.rule.edit_rule')}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onOpenChangeComplete={(open) => {
            if (!open) {
              setSelectedResult(null);
            }
          }}
          width="xl"
          className="shadow-2xl"
        >
          <AbBangumiReview
            rule={selectedResult.bangumi}
            rss={selectedResult.rss}
            onComplete={closeReview}
          />
        </AbPopup>
      )}
    </>
  );
}
