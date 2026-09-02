import { create } from 'zustand';

export type MediaPlayerType = 'jump' | 'iframe';

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

interface PlayerState {
  types: MediaPlayerType[];
  type: MediaPlayerType;
  url: string;

  setType: (type: MediaPlayerType) => void;
  setUrl: (url: string) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  types: ['jump', 'iframe'],
  type: readLS('media-player-type', 'jump' as MediaPlayerType),
  url: readLS('media-player-url', ''),

  setType(type) {
    writeLS('media-player-type', type);
    set({ type });
  },

  setUrl(url) {
    writeLS('media-player-url', url);
    set({ url });
  },
}));
