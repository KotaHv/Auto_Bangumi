import { axios } from '@/utils/axios';
import { Observable } from 'rxjs';

import type { BangumiAPI, BangumiRule } from '@/types/bangumi';

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

      // The backend closes this finite SSE stream when the search finishes.
      // EventSource reports that closure through `onerror`, so treat it as
      // completion rather than a transport error. This also means genuine
      // connection failures cannot currently be distinguished from normal completion.
      eventSource.onerror = () => {
        eventSource.close();
        observer.complete();
      };

      return () => {
        eventSource.close();
      };
    });

    return bangumiInfo$;
  },

  async getProvider(signal?: AbortSignal) {
    const { data } = await axios.get<string[]>('api/v1/search/provider', {
      signal,
    });
    return data;
  },
};
