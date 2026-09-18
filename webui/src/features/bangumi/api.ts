import { axios } from '@/lib/axios';
import { omit } from 'radash';
import { toBangumiAPI, toBangumiRule } from './mapper';
import type { BangumiAPI, BangumiRule } from './types';
import type { ApiSuccess } from '@/types/api';

export const apiBangumi = {
  async getAll(signal?: AbortSignal) {
    const { data } = await axios.get<Array<BangumiAPI & { id: number }>>(
      'api/v1/bangumi/get/all',
      { signal },
    );
    return data.map((bangumi) => ({
      ...toBangumiRule(bangumi),
      id: bangumi.id,
    }));
  },
  async updateRule(bangumiId: number, bangumiRule: BangumiRule) {
    const post = omit(toBangumiAPI(bangumiRule), ['id']);
    const { data } = await axios.patch<ApiSuccess>(
      `api/v1/bangumi/update/${bangumiId}`,
      post,
    );
    return data;
  },
  async deleteRule(bangumiId: number | number[], file: boolean) {
    let url = 'api/v1/bangumi/delete';
    let ids: undefined | number[];

    if (typeof bangumiId === 'number') {
      url = `${url}/${bangumiId}`;
    } else {
      url = `${url}/many`;
      ids = bangumiId;
    }

    const { data } = await axios.delete<ApiSuccess>(url, {
      data: ids,
      params: {
        file,
      },
    });
    return data;
  },
  async disableRule(bangumiId: number | number[], file: boolean) {
    let url = 'api/v1/bangumi/disable';
    let ids: undefined | number[];

    if (typeof bangumiId === 'number') {
      url = `${url}/${bangumiId}`;
    } else {
      url = `${url}/many`;
      ids = bangumiId;
    }

    const { data } = await axios.post<ApiSuccess>(url, ids, {
      params: {
        file,
      },
    });
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
  async rename(bangumiData: BangumiRule) {
    const postData = toBangumiAPI(bangumiData);
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/bangumi/rename',
      postData,
    );
    return data;
  },
  async forceCollect(bangumiData: BangumiRule) {
    const postData = toBangumiAPI(bangumiData);
    const { data } = await axios.post<ApiSuccess>(
      'api/v1/rss/force-collect',
      postData,
    );
    return data;
  },
};
