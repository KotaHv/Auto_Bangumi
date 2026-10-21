import type { BangumiData, PersistedBangumi } from '@/features/bangumi/types';
import type {
  NonEmptyArray,
  RSSAnalysisOptionAPI,
} from '@/features/rss/types/rss';
import type { SearchResult } from './types';

export type SearchReview =
  | { kind: 'exact'; rule: PersistedBangumi }
  | { kind: 'candidates'; options: NonEmptyArray<RSSAnalysisOptionAPI> }
  | { kind: 'create'; rule: BangumiData };

export function selectSearchReview(result: SearchResult): SearchReview | null {
  const exact = result.options.find((option) => option.type === 'exact_match');
  if (exact) return { kind: 'exact', rule: exact.bangumi };

  if (result.options.some((option) => option.type === 'candidate')) {
    return { kind: 'candidates', options: result.options };
  }

  const create = result.options.find((option) => option.type === 'create');
  return create ? { kind: 'create', rule: create.bangumi } : null;
}

export function searchResultBangumi(result: SearchResult): BangumiData {
  const create = result.options.find((option) => option.type === 'create');
  // analysis_options only omits the create option for exact matches, so
  // options[0] is the exact match here (pinned by the fallback test).
  return create?.bangumi ?? result.options[0].bangumi;
}
