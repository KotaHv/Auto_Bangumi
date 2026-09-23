import { axios } from '@/lib/axios';
import { PAGE_SIZE } from './constants';
import type { ClearLogResult, LogFilters, LogPage } from './types';

export const apiLog = {
  async getLog(
    filters: LogFilters,
    beforeId: number | null,
    signal?: AbortSignal,
  ): Promise<LogPage> {
    const { data } = await axios.get<LogPage>('api/v1/log', {
      signal,
      params: {
        level: filters.level ?? undefined,
        start: filters.start ?? undefined,
        end: filters.end ?? undefined,
        module: filters.module || undefined,
        query: filters.query || undefined,
        limit: PAGE_SIZE,
        before_id: beforeId ?? undefined,
      },
    });
    return data;
  },

  async clearLog(): Promise<ClearLogResult> {
    const { data } = await axios.delete<ClearLogResult>('api/v1/log');
    return data;
  },
};
