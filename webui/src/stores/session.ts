import { create } from 'zustand';

const LOGGED_IN_KEY = 'isLoggedIn';

function readLoggedIn() {
  return localStorage.getItem(LOGGED_IN_KEY) === '1';
}

interface SessionState {
  isLoggedIn: boolean;

  setLoggedIn: (value: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isLoggedIn: readLoggedIn(),

  setLoggedIn(value) {
    localStorage.setItem(LOGGED_IN_KEY, value ? '1' : '0');
    set({ isLoggedIn: value });
  },
}));
