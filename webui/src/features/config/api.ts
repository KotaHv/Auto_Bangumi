import { axios } from '@/lib/axios';
import type { Config } from './types/config';
import type { ApiSuccess } from '@/types/api';

export const apiConfig = {
  async getConfig(signal?: AbortSignal) {
    const { data } = await axios.get<Config>('api/v1/config/get', { signal });
    return data;
  },
  async updateConfig(newConfig: Config) {
    const { data } = await axios.patch<ApiSuccess>(
      'api/v1/config/update',
      newConfig,
    );
    return data;
  },
};
