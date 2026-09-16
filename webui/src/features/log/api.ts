import { axios } from '@/lib/axios';
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
    const { data } = await axios.delete<ApiSuccess>('api/v1/log');
    return data;
  },
};
