import { create } from 'zustand';
import type { User } from '#/auth';
import { apiAuth } from '@/api/auth';
import { executeApi } from '@/hooks/use-api';
import { i18n } from '@/i18n';
import { message } from '@/lib/message';

const LOGGED_IN_KEY = 'isLoggedIn';

function readLoggedIn() {
  return localStorage.getItem(LOGGED_IN_KEY) === '1';
}

interface AuthState {
  isLoggedIn: boolean;
  user: User;

  setLoggedIn: (value: boolean) => void;
  setUser: (patch: Partial<User>) => void;
  clearUser: () => void;
  formVerify: () => boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  update: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: readLoggedIn(),
  user: {
    username: '',
    password: '',
  },

  setLoggedIn(value) {
    localStorage.setItem(LOGGED_IN_KEY, value ? '1' : '0');
    set({ isLoggedIn: value });
  },

  setUser(patch) {
    set((state) => ({ user: { ...state.user, ...patch } }));
  },

  clearUser() {
    set({ user: { username: '', password: '' } });
  },

  formVerify() {
    const { user } = get();
    if (user.username === '') {
      message.warning(
        i18n.t('notify.please_enter', {
          field: i18n.t('topbar.profile.username'),
        }),
      );
      return false;
    }
    if (user.password === '') {
      message.warning(
        i18n.t('notify.please_enter', {
          field: i18n.t('topbar.profile.password'),
        }),
      );
      return false;
    }
    if (user.password.length < 8) {
      message.error(i18n.t('notify.password_length_error'));
      return false;
    }
    return true;
  },

  async login() {
    if (!get().formVerify()) return;

    const { username, password } = get().user;
    try {
      await apiAuth.login(username, password);
      get().setLoggedIn(true);
      get().clearUser();
      message.success(i18n.t('notify.login_success'));
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        message.error(i18n.t('notify.please_update'));
      }
    }
  },

  async logout() {
    await executeApi(apiAuth.logout, {
      showMessage: true,
      onSuccess() {
        get().clearUser();
        get().setLoggedIn(false);
      },
    });
  },

  async refresh() {
    await executeApi(apiAuth.refresh, {
      showMessage: false,
      onSuccess() {
        get().setLoggedIn(true);
      },
    });
  },

  async update() {
    if (!get().formVerify()) return;

    const { username, password } = get().user;
    try {
      const res = await apiAuth.update(username, password);
      if (res.message.toLocaleLowerCase() === 'update success') {
        get().clearUser();
        message.success(i18n.t('notify.update_success'));
      } else {
        set((state) => ({ user: { ...state.user, password: '' } }));
        message.error(i18n.t('notify.update_failed'));
      }
    } catch {
      /* 拦截器已提示 */
    }
  },
}));
