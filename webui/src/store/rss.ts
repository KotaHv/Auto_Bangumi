import { create } from 'zustand';
import { apiRSS } from '@/api/rss';
import { executeApi } from '@/hooks/use-api';
import type { RSS } from '#/rss';

interface RSSState {
  rss: RSS[];
  selectedRSS: number[];

  setSelectedRSS: (ids: number[]) => void;
  getAll: () => Promise<void>;
  updateRSS: (id: number, rss: RSS) => Promise<void>;
  disableRSS: (ids: number[]) => Promise<void>;
  deleteRSS: (ids: number[]) => Promise<void>;
  enableRSS: (ids: number[]) => Promise<void>;

  disableSelected: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  enableSelected: () => Promise<void>;
}

function sortByIdDesc(arr: RSS[]) {
  return [...arr].sort((a, b) => b.id - a.id);
}

export const useRSSStore = create<RSSState>((set, get) => ({
  rss: [],
  selectedRSS: [],

  setSelectedRSS(ids) {
    set({ selectedRSS: ids });
  },

  async getAll() {
    const res = await apiRSS.get();

    const enabled = sortByIdDesc(res.filter((e) => e.enabled));
    const disabled = sortByIdDesc(res.filter((e) => !e.enabled));

    set({ rss: [...enabled, ...disabled] });
  },

  async updateRSS(id, rss) {
    await executeApi(
      apiRSS.update,
      {
        showMessage: true,
        onSuccess() {
          get().getAll();
          get().setSelectedRSS([]);
        },
      },
      id,
      rss,
    );
  },

  async disableRSS(ids) {
    await executeApi(
      apiRSS.disableMany,
      {
        showMessage: true,
        onSuccess() {
          get().getAll();
          get().setSelectedRSS([]);
        },
      },
      ids,
    );
  },

  async deleteRSS(ids) {
    await executeApi(
      apiRSS.deleteMany,
      {
        showMessage: true,
        onSuccess() {
          get().getAll();
          get().setSelectedRSS([]);
        },
      },
      ids,
    );
  },

  async enableRSS(ids) {
    await executeApi(
      apiRSS.enableMany,
      {
        showMessage: true,
        onSuccess() {
          get().getAll();
          get().setSelectedRSS([]);
        },
      },
      ids,
    );
  },

  disableSelected() {
    return get().disableRSS(get().selectedRSS);
  },
  deleteSelected() {
    return get().deleteRSS(get().selectedRSS);
  },
  enableSelected() {
    return get().enableRSS(get().selectedRSS);
  },
}));
