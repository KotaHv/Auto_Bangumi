import { create } from 'zustand';
import { apiLog } from '@/api/log';
import { message } from '@/components/message';
import { executeApi } from '@/hooks/use-api';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/store/auth';
import { copyText } from '@/lib/clipboard';

interface LogState {
  log: string;

  getLog: () => Promise<void>;
  reset: () => Promise<void>;
  copy: () => Promise<void>;
}

export const useLogStore = create<LogState>((set) => ({
  log: '',

  async getLog() {
    if (!useAuthStore.getState().isLoggedIn) return;
    try {
      const res = await apiLog.getLog();
      set({ log: res });
    } catch {
      /* 拦截器已提示 */
    }
  },

  async reset() {
    await executeApi(apiLog.clearLog, {
      showMessage: true,
      onSuccess() {
        set({ log: '' });
      },
    });
  },

  async copy() {
    const log = useLogStore.getState().log;
    if (await copyText(log)) {
      message.success(i18n.t('notify.copy_success'));
    } else {
      message.error(i18n.t('notify.copy_failed'));
    }
  },
}));

let timer: number | undefined;

export function startLogPolling() {
  if (timer !== undefined) return;
  useLogStore.getState().getLog();
  timer = window.setInterval(() => useLogStore.getState().getLog(), 10000);
}

export function stopLogPolling() {
  window.clearInterval(timer);
  timer = undefined;
}
