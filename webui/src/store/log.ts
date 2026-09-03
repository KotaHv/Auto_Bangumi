import { create } from 'zustand';
import { apiLog } from '@/api/log';
import { message } from '@/components/message';
import { executeApi } from '@/hooks/use-api';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/store/auth';
import { copyText } from '@/lib/clipboard';

interface LogState {
  log: string;
  loaded: boolean;
  lineLimit: number | null;

  setLineLimit: (lineLimit: number | null) => void;
  getLog: (lineLimit?: number | null) => Promise<void>;
  reset: () => Promise<void>;
  copy: () => Promise<void>;
}

export const useLogStore = create<LogState>((set) => ({
  log: '',
  loaded: false,
  lineLimit: 100,

  setLineLimit(lineLimit) {
    set({ lineLimit, loaded: false });
  },

  async getLog(lineLimit = useLogStore.getState().lineLimit) {
    if (!useAuthStore.getState().isLoggedIn) return;
    if (requestInFlight) {
      queuedLineLimit = lineLimit;
      return;
    }
    requestInFlight = true;
    try {
      const res = await apiLog.getLog(lineLimit);
      if (useLogStore.getState().lineLimit === lineLimit) {
        set({ log: res, loaded: true });
      }
    } catch {
      /* 拦截器已提示 */
      if (useLogStore.getState().lineLimit === lineLimit) {
        set({ loaded: true });
      }
    } finally {
      requestInFlight = false;
      if (queuedLineLimit !== undefined) {
        const nextLineLimit = queuedLineLimit;
        queuedLineLimit = undefined;
        void useLogStore.getState().getLog(nextLineLimit);
      }
    }
  },

  async reset() {
    await executeApi(apiLog.clearLog, {
      showMessage: true,
      onSuccess() {
        set({ log: '', loaded: true });
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
let requestInFlight = false;
let queuedLineLimit: number | null | undefined;

export function startLogPolling() {
  if (timer !== undefined) return;
  useLogStore.getState().getLog();
  timer = window.setInterval(() => useLogStore.getState().getLog(), 10000);
}

export function stopLogPolling() {
  window.clearInterval(timer);
  timer = undefined;
}
