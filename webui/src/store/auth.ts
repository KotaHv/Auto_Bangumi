import { create } from 'zustand';

const LOGGED_IN_KEY = 'isLoggedIn';

function readLoggedIn() {
  return localStorage.getItem(LOGGED_IN_KEY) === '1';
}

interface AuthState {
  isLoggedIn: boolean;

  setLoggedIn: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: readLoggedIn(),

  setLoggedIn(value) {
    localStorage.setItem(LOGGED_IN_KEY, value ? '1' : '0');
    set({ isLoggedIn: value });
  },
}));
