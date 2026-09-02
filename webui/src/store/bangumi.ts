import { create } from 'zustand';
import { apiBangumi } from '@/api/bangumi';
import { executeApi } from '@/hooks/use-api';
import { ruleTemplate } from '#/bangumi';
import type { BangumiRule } from '#/bangumi';

interface EditRuleState {
  show: boolean;
  item: BangumiRule;
}

interface BangumiState {
  bangumi: BangumiRule[] | undefined;
  editRule: EditRuleState;

  getAll: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateRule: (id: number, rule: BangumiRule) => Promise<void>;
  enableRule: (id: number) => Promise<void>;
  disableRule: (id: number | number[], file: boolean) => Promise<void>;
  deleteRule: (id: number | number[], file: boolean) => Promise<void>;
  refreshPoster: () => Promise<void>;
  openEditPopup: (data: BangumiRule) => void;
  closeEditPopup: () => void;
  setEditItem: (item: BangumiRule) => void;
  ruleManage: (
    type: 'disable' | 'delete',
    id: number,
    deleteFile: boolean,
  ) => void;
}

function sortByIdDesc(arr: BangumiRule[]) {
  return [...arr].sort((a, b) => b.id - a.id);
}

export const useBangumiStore = create<BangumiState>((set, get) => ({
  bangumi: undefined,
  editRule: {
    show: false,
    item: ruleTemplate,
  },

  async getAll() {
    const res = await apiBangumi.getAll();

    const enabled = sortByIdDesc(res.filter((e) => !e.deleted));
    const disabled = sortByIdDesc(res.filter((e) => e.deleted));

    set({ bangumi: [...enabled, ...disabled] });
  },

  async refreshData() {
    set((state) => ({ editRule: { ...state.editRule, show: false } }));
    await get().getAll();
  },

  async updateRule(id, rule) {
    await executeApi(
      apiBangumi.updateRule,
      {
        showMessage: true,
        onSuccess() {
          get().refreshData();
        },
      },
      id,
      rule,
    );
  },

  async enableRule(id) {
    await executeApi(
      apiBangumi.enableRule,
      {
        showMessage: true,
        onSuccess() {
          get().refreshData();
        },
      },
      id,
    );
  },

  async disableRule(id, file) {
    await executeApi(
      apiBangumi.disableRule,
      {
        showMessage: true,
        onSuccess() {
          get().refreshData();
        },
      },
      id,
      file,
    );
  },

  async deleteRule(id, file) {
    await executeApi(
      apiBangumi.deleteRule,
      {
        showMessage: true,
        onSuccess() {
          get().refreshData();
        },
      },
      id,
      file,
    );
  },

  async refreshPoster() {
    await executeApi(apiBangumi.refreshPoster, {
      showMessage: true,
      onSuccess() {
        get().refreshData();
      },
    });
  },

  openEditPopup(data) {
    set({ editRule: { show: true, item: data } });
  },

  closeEditPopup() {
    set((state) => ({ editRule: { ...state.editRule, show: false } }));
  },

  setEditItem(item) {
    set((state) => ({ editRule: { ...state.editRule, item } }));
  },

  ruleManage(type, id, deleteFile) {
    if (type === 'disable') {
      get().disableRule(id, deleteFile);
    } else {
      get().deleteRule(id, deleteFile);
    }
  },
}));
