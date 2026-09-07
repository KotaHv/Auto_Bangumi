import { axios } from '@/utils/axios';
import type { ApiSuccess } from '@/types/api';

export const apiProgram = {
  async restart() {
    const { data } = await axios.get<ApiSuccess>('api/v1/restart');
    return data;
  },
  async start() {
    const { data } = await axios.get<ApiSuccess>('api/v1/start');
    return data;
  },
  async stop() {
    const { data } = await axios.get<ApiSuccess>('api/v1/stop');
    return data;
  },
  async status(signal?: AbortSignal) {
    const { data } = await axios.get<{ status: boolean; version: string }>(
      'api/v1/status',
      { signal },
    );

    return data!;
  },
  async shutdown() {
    const { data } = await axios.get<ApiSuccess>('api/v1/shutdown');
    return data;
  },
};
