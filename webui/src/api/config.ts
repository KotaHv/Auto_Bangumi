import { axios } from '@/utils/axios';
import type { Config } from '#/config';
import type { ApiSuccess } from '#/api';

export const apiConfig = {
  async getConfig() {
    const { data } = await axios.get<Config>('api/v1/config/get');
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
