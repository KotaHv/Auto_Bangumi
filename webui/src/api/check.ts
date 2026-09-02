import { axios } from '@/utils/axios';
export const apiCheck = {
  async downloader() {
    const { data } = await axios.get<Boolean>('api/v1/check/downloader');
    return data;
  },
};
