import type { RSS } from '@/types/rss';

export const initialRss: RSS = {
  id: 0,
  name: '',
  url: '',
  aggregate: false,
  parser: 'tmdb',
  enabled: false,
};
