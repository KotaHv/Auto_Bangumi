import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AbSearch } from '@/features/search/components/ab-search';
import { AbBangumiCard } from '@/features/bangumi/components/ab-bangumi-card';
import { AbBangumiReview } from '@/features/rss/components/ab-bangumi-review';
import { AbPopup } from '@/components/shared/ab-popup';
import { cn } from '@/lib/utils';
import { searchProviderOptions } from '@/features/search/queries';
import { useSearchSSE } from '@/features/search/hooks/use-search-sse';
import type { SearchResult } from '@/features/search/types';

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
  const { state, search, cancel } = useSearchSSE();

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
    cancel();
    setOpen(false);
  }

  function handleSearch() {
    const keyword = inputValue.trim();
    if (!keyword) {
      handleClear();
      return;
    }

    setInputValue(keyword);
    search(keyword, provider);
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
          loading={state.status === 'loading'}
          inputValue={inputValue}
          onInputChange={(value) => {
            cancel();
            setInputValue(value);
            setOpen(false);
          }}
          onInputFocus={() => setOpen(true)}
          onClear={handleClear}
          onSearch={handleSearch}
          onSelectProvider={(value) => {
            cancel();
            setProvider(value);
            setOpen(false);
          }}
        />

        {open && (
          <div className="absolute top-full left-0 z-50 mt-8 flex max-h-[calc(100dvh-6rem-12px-env(safe-area-inset-bottom))] w-full flex-col gap-3 overflow-y-auto overscroll-contain md:mt-5 md:max-h-[min(24rem,calc(100dvh-4.5rem-env(safe-area-inset-bottom)))]">
            {state.status === 'complete' && state.results.length === 0 && (
              <div className="bg-popover text-muted-foreground rounded-md px-4 py-3 text-sm shadow-md">
                {t('topbar.search.empty')}
              </div>
            )}
            {state.status === 'failed' && (
              <div
                className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm shadow-md"
                role="alert"
              >
                {t(`topbar.search.errors.${state.error}`)}
              </div>
            )}
            {state.results.map((result: SearchResult) => (
              <AbBangumiCard
                key={result.rss.url}
                bangumi={result.bangumi}
                type="search"
                onClick={() => handleSelect(result)}
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
