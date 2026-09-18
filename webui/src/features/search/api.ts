import { Observable } from 'rxjs';

import { axios } from '@/lib/axios';
import { toBangumiRule } from '@/features/bangumi/mapper';
import type {
  SearchFailureCode,
  SearchResultResponse,
  SearchStreamEvent,
} from './types';

export const apiSearch = {
  get(keyword: string, site = 'mikan'): Observable<SearchStreamEvent> {
    return new Observable<SearchStreamEvent>((observer) => {
      const eventSource = new EventSource(
        `api/v1/search/bangumi?site=${site}&keywords=${encodeURIComponent(
          keyword,
        )}`,
        { withCredentials: true },
      );
      function finish(event: SearchStreamEvent) {
        observer.next(event);
        observer.complete();
      }

      function fail(code: SearchFailureCode) {
        finish({ type: 'failure', code });
      }

      eventSource.onmessage = (event) => {
        try {
          const apiData: SearchResultResponse = JSON.parse(event.data);
          observer.next({
            type: 'result',
            result: {
              bangumi: toBangumiRule(apiData.bangumi),
              rss: apiData.rss,
            },
          });
        } catch {
          fail('protocol');
        }
      };

      eventSource.addEventListener('complete', () => {
        finish({ type: 'complete' });
      });

      eventSource.addEventListener('failure', (event) => {
        try {
          const { code } = JSON.parse((event as MessageEvent<string>).data) as {
            code: SearchFailureCode;
          };
          finish({ type: 'failure', code });
        } catch {
          fail('protocol');
        }
      });

      eventSource.onerror = () => fail('transport');

      return () => eventSource.close();
    });
  },

  async getProvider(signal?: AbortSignal) {
    const { data } = await axios.get<string[]>('api/v1/search/provider', {
      signal,
    });
    return data;
  },
};
