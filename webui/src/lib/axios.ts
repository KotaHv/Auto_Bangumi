import Axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import type { ApiError, ApiSuccess } from '@/types/api';
import { message } from '@/lib/message';
import { i18n, returnUserLangText } from '@/lib/i18n';
import { useSessionStore } from '@/stores/session';
import { removeProtectedQueries } from '@/lib/query/client';

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
        const wasLoggedIn = useSessionStore.getState().isLoggedIn;
        useSessionStore.getState().setLoggedIn(false);
        removeProtectedQueries();
        if (err.config?.url?.endsWith('api/v1/auth/login') && errorMsg) {
          message.error(errorMsg);
        } else if (wasLoggedIn) {
          message.error(i18n.t('notify.session_expired'));
        }
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
