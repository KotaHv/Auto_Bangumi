import { create } from 'zustand';
import { apiProgram } from '@/api/program';
import { useAuthStore } from '@/store/auth';

interface AppInfoState {
  running: boolean;
  version: string;

  getStatus: () => void;
}

export const useAppInfoStore = create<AppInfoState>((set) => ({
  running: false,
  version: '',

  getStatus() {
    if (useAuthStore.getState().isLoggedIn) {
      apiProgram.status().then((res) => {
        set({
          running: res.status,
          version: res.version,
        });
      });
    }
  },
}));

let timer: number | undefined;

export function startAppInfoPolling() {
  if (timer !== undefined) return;
  useAppInfoStore.getState().getStatus();
  timer = window.setInterval(
    () => useAppInfoStore.getState().getStatus(),
    3000,
  );
}

export function stopAppInfoPolling() {
  window.clearInterval(timer);
  timer = undefined;
}
