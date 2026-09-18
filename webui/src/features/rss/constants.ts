import type { RSSDraft } from './types/rss';

export const initialRss: RSSDraft = {
  id: null,
  name: '',
  url: '',
  aggregate: false,
  parser: 'tmdb',
  enabled: false,
};
