import { axios } from '@/utils/axios';
import type { ApiSuccess } from '@/types/api';

export const apiLog = {
  async getLog(lines: number | null = 100, signal?: AbortSignal) {
    const { data } = await axios.get<string>('api/v1/log', {
      params: { lines: lines ?? 'all' },
      signal,
    });
    return data;
  },

  async clearLog() {
    const { data } = await axios.get<ApiSuccess>('api/v1/log/clear');
    return data;
  },
};
