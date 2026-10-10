import { axios } from '@/lib/axios';
import type { BangumiData } from '@/features/bangumi/types';
import type {
  RSS,
  RSSAnalysis,
  RSSAnalysisAPI,
  RSSAPI,
  RSSDraft,
} from './types/rss';
import type { ApiSuccess } from '@/types/api';

export const apiRSS = {
  async get(signal?: AbortSignal) {
    const { data } = await axios.get<RSS[]>('api/v1/rss', { signal });
    return data;
  },

  async add(rss: RSSDraft) {
    const { data } = await axios.post<ApiSuccess>('api/v1/rss/add', rss);
    return data;
  },

  async deleteMany(rss_list: number[]) {
    const { data } = await axios.delete<ApiSuccess>(`api/v1/rss/delete/many`, {
      data: rss_list,
    });
    return data!;
  },

  async disableMany(rss_list: number[]) {
    const { data } = await axios.patch<ApiSuccess>(
      `api/v1/rss/disable/many`,
      rss_list,
    );
    return data!;
  },

  async enableMany(rss_list: number[]) {
    const { data } = await axios.patch<ApiSuccess>(
      `api/v1/rss/enable/many`,
      rss_list,
    );
    return data!;
  },

  async refreshAll() {
    const { data } = await axios.post<ApiSuccess>('api/v1/rss/refresh/all');
    return data!;
  },

  async refresh(rss_id: number) {
    const { data } = await axios.post<ApiSuccess>(
      `api/v1/rss/refresh/${rss_id}`,
    );
    return data!;
  },

  async analysis(rss_item: RSSDraft): Promise<RSSAnalysis> {
    const { data } = await axios.post<RSSAnalysisAPI>(
      'api/v1/rss/analysis',
      rss_item,
    );

    return data;
  },
  async collection(bangumiData: BangumiData) {
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/collect',
      bangumiData,
    );
    return data;
  },
  async subscribe(bangumi: BangumiData, rss: RSSAPI) {
    const postData = { data: bangumi, rss };
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/subscribe/new',
      postData,
    );
    return data;
  },
  async addToBangumi(rss: RSSAPI, bangumiId: number) {
    const postData = { rss, bangumi_id: bangumiId };
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/subscribe/existing',
      postData,
    );
    return data;
  },
};
