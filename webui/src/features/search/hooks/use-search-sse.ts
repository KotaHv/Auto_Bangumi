import { useCallback, useEffect, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';

import { apiSearch } from '../api';
import type { SearchState, SearchStreamEvent } from '../types';

export function useSearchSSE() {
  const subscriptionRef = useRef<Subscription | null>(null);
  const [state, setState] = useState<SearchState>({
    status: 'idle',
    results: [],
  });

  useEffect(() => {
    return () => subscriptionRef.current?.unsubscribe();
  }, []);

  const search = useCallback((keyword: string, provider: string) => {
    subscriptionRef.current?.unsubscribe();
    setState({ status: 'loading', results: [] });

    subscriptionRef.current = apiSearch.get(keyword, provider).subscribe({
      next: (event) => {
        setState((current) => transitionSearchState(current, event));
        if (event.type !== 'result') {
          subscriptionRef.current = null;
        }
      },
      error: () => {
        setState((current) =>
          transitionSearchState(current, {
            type: 'failure',
            code: 'transport',
          }),
        );
        subscriptionRef.current = null;
      },
    });
  }, []);

  const cancel = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setState({ status: 'idle', results: [] });
  }, []);

  return { state, search, cancel };
}

function transitionSearchState(
  state: SearchState,
  event: SearchStreamEvent,
): SearchState {
  if (state.status !== 'loading') return state;

  if (event.type === 'result') {
    return { ...state, results: [...state.results, event.result] };
  }

  if (event.type === 'complete') {
    return { status: 'complete', results: state.results };
  }

  return {
    status: 'failed',
    results: state.results,
    error: event.code,
  };
}
