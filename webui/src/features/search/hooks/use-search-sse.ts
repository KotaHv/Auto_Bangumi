import { useCallback, useEffect, useRef, useState } from 'react';
import {
  catchError,
  EMPTY,
  finalize,
  of,
  Subject,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { apiSearch } from '../api';
import type { OrderedSearchResult, SearchResult } from '../types';

type SearchMode = 'auto' | 'immediate';

type SearchRequest = {
  keyword: string;
  provider: string;
  mode: SearchMode;
};

export function useSearchSSE() {
  const requestsRef = useRef<Subject<SearchRequest> | null>(null);
  if (!requestsRef.current) {
    requestsRef.current = new Subject<SearchRequest>();
  }

  const [bangumiList, setBangumiList] = useState<OrderedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchProvider, setSearchProvider] = useState('');

  useEffect(() => {
    const requests$ = requestsRef.current;
    if (!requests$) return;

    const subscription = requests$
      .pipe(
        switchMap(({ keyword, provider, mode }) => {
          if (!keyword) {
            setBangumiList([]);
            setSearchKeyword('');
            setSearchProvider('');
            setLoading(false);
            return EMPTY;
          }

          const start$ = mode === 'auto' ? timer(600) : of(0);
          return start$.pipe(
            switchMap(() => {
              setBangumiList([]);
              setSearchKeyword(keyword);
              setSearchProvider(provider);
              setLoading(true);
              return apiSearch.get(keyword, provider).pipe(
                tap((value: SearchResult) => {
                  setBangumiList((current) => [
                    ...current,
                    { order: current.length + 1, value },
                  ]);
                }),
                catchError(() => EMPTY),
                finalize(() => setLoading(false)),
              );
            }),
          );
        }),
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const search = useCallback(
    (keyword: string, provider: string, mode: SearchMode) => {
      requestsRef.current?.next({ keyword, provider, mode });
    },
    [],
  );

  return {
    bangumiList,
    loading,
    searchKeyword,
    searchProvider,
    search,
  };
}
