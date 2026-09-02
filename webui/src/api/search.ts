import { axios } from '@/utils/axios';
import { Observable } from 'rxjs';

import type { BangumiAPI, BangumiRule } from '#/bangumi';

export const apiSearch = {
  get(keyword: string, site = 'mikan'): Observable<BangumiRule> {
    const bangumiInfo$ = new Observable<BangumiRule>((observer) => {
      const eventSource = new EventSource(
        `api/v1/search/bangumi?site=${site}&keywords=${encodeURIComponent(
          keyword,
        )}`,
        { withCredentials: true },
      );

      eventSource.onmessage = (ev) => {
        try {
          const apiData: BangumiAPI = JSON.parse(ev.data);
          const data: BangumiRule = {
            ...apiData,
            filter: apiData.filter.split(','),
          };
          observer.next(data);
        } catch (error) {
          console.error(
            '[/search/bangumi] Parse Error |',
            { keyword },
            'response:',
            ev.data,
          );
        }
      };

      eventSource.onerror = (ev) => {
        console.error(
          '[/search/bangumi] Server Error |',
          { keyword },
          'error:',
          ev,
        );
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    });

    return bangumiInfo$;
  },

  async getProvider() {
    const { data } = await axios.get<string[]>('api/v1/search/provider');
    return data;
  },
};
