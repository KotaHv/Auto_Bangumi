import { axios } from '@/lib/axios';
import { toBangumiAPI, toBangumiRule } from '@/features/bangumi/mapper';
import type { BangumiAPI, BangumiRule } from '@/features/bangumi/types';
import type { RSS, RSSAPI, RSSDraft } from './types/rss';
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
    const { data } = await axios.post<ApiSuccess>(
      `api/v1/rss/delete/many`,
      rss_list,
    );
    return data!;
  },

  async disableMany(rss_list: number[]) {
    const { data } = await axios.post<ApiSuccess>(
      `api/v1/rss/disable/many`,
      rss_list,
    );
    return data!;
  },

  async enableMany(rss_list: number[]) {
    const { data } = await axios.post<ApiSuccess>(
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

  async analysis(rss_item: RSSDraft) {
    const { data } = await axios.post<BangumiAPI>(
      'api/v1/rss/analysis',
      rss_item,
    );

    return toBangumiRule(data);
  },
  async collection(bangumiData: BangumiRule) {
    const postData = toBangumiAPI(bangumiData);
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/collect',
      postData,
    );
    return data;
  },
  async subscribe(bangumiData: BangumiRule, rss: RSSAPI) {
    const bangumi = toBangumiAPI(bangumiData);
    const postData = {
      data: bangumi,
      rss,
    };
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/subscribe',
      postData,
    );
    return data;
  },
};
