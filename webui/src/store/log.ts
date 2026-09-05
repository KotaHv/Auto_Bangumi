import { create } from 'zustand';
import { apiLog } from '@/api/log';
import { message } from '@/lib/message';
import { executeApi } from '@/hooks/use-api';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/store/auth';
import { copyText } from '@/lib/clipboard';

type LogLoading = false | 'visible' | 'silent';

let activeLogRequest: Promise<void> | undefined;

interface LogState {
  log: string;
  loaded: boolean;
  loading: LogLoading;
  resetting: boolean;
  lineLimit: number | null;

  setLineLimit: (lineLimit: number | null) => void;
  getLog: (lineLimit?: number | null, showLoading?: boolean) => Promise<void>;
  reset: () => Promise<void>;
  copy: () => Promise<void>;
}

export const useLogStore = create<LogState>((set, get) => ({
  log: '',
  loaded: false,
  loading: false,
  resetting: false,
  lineLimit: 100,

  setLineLimit(lineLimit) {
    set({ lineLimit });
  },

  async getLog(lineLimit = get().lineLimit, showLoading = true) {
    if (!useAuthStore.getState().isLoggedIn) return;
    const requestInProgress = get().loading !== false;
    if (showLoading) {
      set({ loading: 'visible' });
    }
    if (requestInProgress) {
      await activeLogRequest;
      return;
    }
    if (!showLoading) {
      set({ loading: 'silent' });
    }
    const request = (async () => {
      try {
        const res = await apiLog.getLog(lineLimit);
        if (get().lineLimit === lineLimit) {
          set({ log: res, loaded: true });
        }
      } catch {
        /* 拦截器已提示 */
        if (get().lineLimit === lineLimit) {
          set({ loaded: true });
        }
      } finally {
        set({ loading: false });
      }
    })();
    activeLogRequest = request;
    try {
      await request;
    } finally {
      if (activeLogRequest === request) {
        activeLogRequest = undefined;
      }
    }
  },

  async reset() {
    if (get().resetting) return;
    set({ resetting: true });
    try {
      await executeApi(apiLog.clearLog, {
        showMessage: true,
        onSuccess() {
          set({ log: '', loaded: true });
        },
      });
    } finally {
      set({ resetting: false });
    }
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
let pollingActive = false;
let pollingGeneration = 0;

async function pollLog(showLoading: boolean, generation: number) {
  await useLogStore.getState().getLog(undefined, showLoading);
  if (!pollingActive || generation !== pollingGeneration) return;

  timer = window.setTimeout(() => {
    timer = undefined;
    void pollLog(false, generation);
  }, 10000);
}

export function startLogPolling() {
  if (pollingActive) return;
  pollingActive = true;
  const generation = ++pollingGeneration;
  void pollLog(true, generation);
}

export function stopLogPolling() {
  pollingActive = false;
  pollingGeneration += 1;
  window.clearTimeout(timer);
  timer = undefined;
}
