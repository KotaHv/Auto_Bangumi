import { axios } from '@/lib/axios';
import type { BangumiAPI, BangumiRule } from '@/features/bangumi/types';
import type { RSS } from './types/rss';
import type { Torrent } from './types/torrent';
import type { ApiSuccess } from '@/types/api';

export const apiRSS = {
  async get(signal?: AbortSignal) {
    const { data } = await axios.get<RSS[]>('api/v1/rss', { signal });
    return data;
  },

  async add(rss: RSS) {
    const { data } = await axios.post<ApiSuccess>('api/v1/rss/add', rss);
    return data;
  },

  async delete(rss_id: number) {
    const { data } = await axios.delete<ApiSuccess>(
      `api/v1/rss/delete/${rss_id}`,
    );
    return data!;
  },

  async deleteMany(rss_list: number[]) {
    const { data } = await axios.post<ApiSuccess>(
      `api/v1/rss/delete/many`,
      rss_list,
    );
    return data!;
  },

  async disable(rss_id: number) {
    const { data } = await axios.patch<ApiSuccess>(
      `api/v1/rss/disable/${rss_id}`,
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

  async update(rss_id: number, rss: RSS) {
    const { data } = await axios.patch<ApiSuccess>(
      `api/v1/rss/update/${rss_id}`,
      rss,
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
    const { data } = await axios.get<ApiSuccess>('api/v1/rss/refresh/all');
    return data!;
  },

  async refresh(rss_id: number) {
    const { data } = await axios.get<ApiSuccess>(
      `api/v1/rss/refresh/${rss_id}`,
    );
    return data!;
  },

  async getTorrent(rss_id: number) {
    const { data } = await axios.get<Torrent[]>(`api/v1/rss/torrent/${rss_id}`);
    return data!;
  },
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
};
