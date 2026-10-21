import { describe, expect, test } from 'bun:test';

import type { RSSAnalysisOptionAPI } from '../src/features/rss/types/rss';
import {
  searchResultBangumi,
  selectSearchReview,
} from '../src/features/search/review';
import { makeBangumi, makeRss } from './fixtures';

const bangumi = makeBangumi();

const createOption = {
  type: 'create',
  bangumi,
} satisfies RSSAnalysisOptionAPI;

const candidateOption = {
  type: 'candidate',
  bangumi: { ...bangumi, id: 1 },
} satisfies RSSAnalysisOptionAPI;

const exactOption = {
  type: 'exact_match',
  bangumi: { ...bangumi, id: 2 },
} satisfies RSSAnalysisOptionAPI;

const rss = makeRss();

describe('selectSearchReview', () => {
  test('uses the existing rule for an exact match', () => {
    expect(selectSearchReview({ options: [exactOption], rss })).toEqual({
      kind: 'exact',
      rule: exactOption.bangumi,
    });
  });

  test('offers candidates when no exact match exists', () => {
    expect(
      selectSearchReview({ options: [candidateOption, createOption], rss }),
    ).toEqual({
      kind: 'candidates',
      options: [candidateOption, createOption],
    });
  });

  test('creates a rule when only the create option exists', () => {
    expect(selectSearchReview({ options: [createOption], rss })).toEqual({
      kind: 'create',
      rule: createOption.bangumi,
    });
  });
});

describe('searchResultBangumi', () => {
  test('prefers the create option for display', () => {
    expect(
      searchResultBangumi({ options: [candidateOption, createOption], rss }),
    ).toBe(bangumi);
  });

  test('falls back to the exact match rule without a create option', () => {
    expect(searchResultBangumi({ options: [exactOption], rss })).toBe(
      exactOption.bangumi,
    );
  });
});
