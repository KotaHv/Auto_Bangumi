import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiSearch } from '@/api/search';
import { emptySearchResultsOptions, searchKeys } from '@/query/options';
import type { SearchResult } from '#/bangumi';

export function useSearchSSE(keyword: string, provider: string, trigger = 0) {
  const queryClient = useQueryClient();
  const query = useQuery(emptySearchResultsOptions(keyword, provider));
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!keyword) {
      setSearching(false);
      return;
    }

    setSearching(true);
    let subscription: { unsubscribe: () => void } | undefined;
    const timer = window.setTimeout(() => {
      const queryKey = searchKeys.results(keyword, provider);
      queryClient.setQueryData<SearchResult[]>(queryKey, []);
      subscription = apiSearch.get(keyword, provider).subscribe({
        next: (value) => {
          queryClient.setQueryData<SearchResult[]>(queryKey, (current = []) => [
            ...current,
            { order: current.length + 1, value },
          ]);
          setSearching(false);
        },
        error: () => setSearching(false),
        complete: () => setSearching(false),
      });
    }, 600);

    return () => {
      window.clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, [keyword, provider, queryClient, trigger]);

  return {
    bangumiList: query.data ?? [],
    loading: searching,
  };
}
