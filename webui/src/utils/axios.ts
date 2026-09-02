import Axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import type { ApiError, ApiSuccess } from '#/api';
import { message } from '@/components/message';
import { returnUserLangText } from '@/i18n';
import { useAuthStore } from '@/store/auth';

export const axios = Axios.create({
  withCredentials: true,
});

axios.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError<ApiSuccess>) => {
    const status = err.response?.status as ApiError['status'];
    const msg_en = err.response?.data.msg_en ?? '';
    const msg_zh = err.response?.data.msg_zh ?? '';

    const errorMsg = returnUserLangText({
      en: msg_en,
      'zh-CN': msg_zh,
    });

    switch (status) {
      case 401:
        useAuthStore.getState().setLoggedIn(false);
        if (errorMsg) message.error(errorMsg);
        break;
      case 406:
        if (errorMsg) message.error(errorMsg);
        break;
      case 500:
        message.error(
          errorMsg ||
            returnUserLangText({
              en: 'Server error!',
              'zh-CN': '服务器错误！',
            }),
        );
        break;
    }

    const error: ApiError = {
      status,
      msg_en,
      msg_zh,
    };

    return Promise.reject(error);
  },
);
