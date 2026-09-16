import { axios } from '@/lib/axios';
import type { ApiSuccess } from '@/types/api';

export const apiAuth = {
  async login(username: string, password: string) {
    const formData = new URLSearchParams({
      username,
      password,
    });

    const { data } = await axios.post<ApiSuccess>(
      'api/v1/auth/login',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return data;
  },

  async logout() {
    const { data } = await axios.post<ApiSuccess>('api/v1/auth/logout');
    return data;
  },

  async update(username: string, password: string) {
    const { data } = await axios.post<ApiSuccess>('api/v1/auth/update', {
      username,
      password,
    });

    return data;
  },
};
