import { axios } from '@/utils/axios';
import type { BangumiAPI, BangumiRule } from '@/types/bangumi';
import type { RSS } from '@/types/rss';
import type { ApiSuccess } from '@/types/api';

export const apiDownload = {
  async analysis(rss_item: RSS) {
    const { data } = await axios.post<BangumiAPI>(
      'api/v1/rss/analysis',
      rss_item,
    );

    const result: BangumiRule = {
      ...data,
      filter: data.filter.split(','),
    };
    return result;
  },
  async collection(bangumiData: BangumiRule) {
    const postData: BangumiAPI = {
      ...bangumiData,
      filter: bangumiData.filter.join(','),
    };
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/collect',
      postData,
    );
    return data;
  },
  async subscribe(bangumiData: BangumiRule, rss: RSS) {
    const bangumi: BangumiAPI = {
      ...bangumiData,
      filter: bangumiData.filter.join(','),
    };
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
  async forceCollect(bangumiData: BangumiRule) {
    const postData: BangumiAPI = {
      ...bangumiData,
      filter: bangumiData.filter.join(','),
    };
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/force-collect',
      postData,
    );
    return data;
  },
};
