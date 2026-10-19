import { axios } from '@/lib/axios';
import type { BangumiData, PersistedBangumi } from './types';
import type { ApiSuccess } from '@/types/api';

export const apiBangumi = {
  async getAll(signal?: AbortSignal) {
    const { data } = await axios.get<PersistedBangumi[]>(
      'api/v1/bangumi/get/all',
      { signal },
    );
    return data;
  },
  async updateRule(bangumi: PersistedBangumi) {
    const { data } = await axios.patch<ApiSuccess>(
      'api/v1/bangumi/update',
      bangumi,
    );
    return data;
  },
  async deleteRule(bangumiId: number, file: boolean) {
    const { data } = await axios.delete<ApiSuccess>(
      `api/v1/bangumi/delete/${bangumiId}`,
      { params: { file } },
    );
    return data;
  },
  async disableRule(bangumiId: number, file: boolean) {
    const { data } = await axios.post<ApiSuccess>(
      `api/v1/bangumi/disable/${bangumiId}`,
      undefined,
      { params: { file } },
    );
    return data;
  },
  async enableRule(bangumiId: number) {
    const { data } = await axios.post<ApiSuccess>(
      `api/v1/bangumi/enable/${bangumiId}`,
    );
    return data;
  },
  async refreshPoster() {
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/bangumi/refresh/poster/all',
    );
    return data;
  },
  async rename(bangumiData: BangumiData) {
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/bangumi/rename',
      bangumiData,
    );
    return data;
  },
  async forceCollect(bangumiId: number) {
    const { data } = await axios.post<ApiSuccess>('api/v1/rss/force-collect', {
      bangumi_id: bangumiId,
    });
    return data;
  },
};
