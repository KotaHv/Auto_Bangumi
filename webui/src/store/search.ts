import { create } from 'zustand';
import { Subject, debounceTime, switchMap, EMPTY } from 'rxjs';
import { apiSearch } from '@/api/search';
import type { BangumiRule, SearchResult } from '#/bangumi';

interface SearchState {
  bangumiList: SearchResult[];
  inputValue: string;
  providers: string[];
  provider: string;
  loading: boolean;

  setInputValue: (value: string) => void;
  setProvider: (provider: string) => void;
  getProviders: () => void;
  onSearch: () => void;
  clearSearch: () => void;
}

const input$ = new Subject<string>();

let providerSnapshot = 'mikan';
input$
  .pipe(
    debounceTime(600),
    switchMap((input) => {
      useSearchStore.setState({ bangumiList: [] });
      return input ? apiSearch.get(input, providerSnapshot) : EMPTY;
    }),
  )
  .subscribe((bangumi) => {
    useSearchStore.setState((s) => ({
      bangumiList: [
        ...s.bangumiList,
        { order: s.bangumiList.length + 1, value: bangumi },
      ],
      loading: false,
    }));
  });

export const useSearchStore = create<SearchState>((set, get) => ({
  bangumiList: [],
  inputValue: '',
  providers: ['mikan', 'dmhy', 'nyaa'],
  provider: 'mikan',
  loading: false,

  setInputValue(value) {
    set({ inputValue: value });
    input$.next(value);
    set({ loading: !!value });
  },

  setProvider(provider) {
    providerSnapshot = provider;
    set({ provider });
    input$.next(get().inputValue);
  },

  getProviders() {
    apiSearch.getProvider().then((res) => {
      set({ providers: res });
    });
  },

  onSearch() {
    input$.next(get().inputValue);
  },

  clearSearch() {
    set({ inputValue: '', bangumiList: [], loading: false });
  },
}));
