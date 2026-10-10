import { axios } from '@/lib/axios';
import { toBangumiAPI, toBangumiRule } from '@/features/bangumi/mapper';
import type { BangumiRule } from '@/features/bangumi/types';
import type {
  RSS,
  RSSAnalysis,
  RSSAnalysisAPI,
  RSSAnalysisOption,
  RSSAnalysisOptionAPI,
  RSSAPI,
  RSSDraft,
} from './types/rss';
import type { ApiSuccess } from '@/types/api';

function mapAnalysisOption(option: RSSAnalysisOptionAPI): RSSAnalysisOption {
  const bangumi = toBangumiRule(option.bangumi);
  return option.type === 'exact_match'
    ? { type: option.type, bangumi: { ...bangumi, id: option.bangumi.id } }
    : { type: option.type, bangumi };
}

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

    return {
      options: data.options.map(mapAnalysisOption) as RSSAnalysis['options'],
    };
  },
  async collection(bangumiData: BangumiRule) {
    const postData = toBangumiAPI(bangumiData);
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/collect',
      postData,
    );
    return data;
  },
  async subscribe(bangumi: BangumiRule, rss: RSSAPI) {
    const postData = { data: toBangumiAPI(bangumi), rss };
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
