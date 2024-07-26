<script lang="ts" setup>
import type { BangumiRule } from '#/bangumi';

const emit = defineEmits<{
  (e: 'apply', rule: BangumiRule): void;
  (e: 'enable', id: number): void;
  (
    e: 'deleteFile',
    type: 'disable' | 'delete',
    opts: { id: number; deleteFile: boolean }
  ): void;
}>();

const { t } = useMyI18n();

const show = defineModel('show', { default: false });
const rule = defineModel<BangumiRule>('rule', {
  required: true,
});

const { getAll } = useBangumiStore();

const deleteFileDialog = reactive<{
  show: boolean;
  type: 'disable' | 'delete';
}>({
  show: false,
  type: 'disable',
});

const forceCollectDialog = reactive({
  show: false,
});

const loading = reactive({
  collect: false,
  rename: false,
});

watch(show, (val) => {
  if (!val) {
    deleteFileDialog.show = false;
    forceCollectDialog.show = false;
  }
});

function showDeleteFileDialog(type: String) {
  deleteFileDialog.show = true;
  if (type === 'disable' || type === '禁用') {
    deleteFileDialog.type = 'disable';
  } else {
    deleteFileDialog.type = 'delete';
  }
}

function showForceCollectDialog(show: boolean) {
  forceCollectDialog.show = show;
}

const close = () => (show.value = false);

function emitdeleteFile(deleteFile: boolean) {
  emit('deleteFile', deleteFileDialog.type, {
    id: rule.value.id,
    deleteFile,
  });
}

function forceCollect() {
  if (rule.value) {
    useApi(apiDownload.forceCollect, {
      showMessage: true,
      onBeforeExecute() {
        loading.collect = true;
      },
      onSuccess() {
        getAll();
        show.value = false;
      },
      onFinally() {
        loading.collect = false;
      },
    }).execute(rule.value);
  }
}

function emitApply() {
  emit('apply', rule.value);
}

function emitEnable() {
  emit('enable', rule.value.id);
}

function rename() {
  if (rule.value) {
    useApi(apiBangumi.rename, {
      showMessage: true,
      onBeforeExecute() {
        loading.rename = true;
      },
      onSuccess() {
        getAll();
        show.value = false;
      },
      onFinally() {
        loading.rename = false;
      },
    }).execute(rule.value);
  }
}

const popupTitle = computed(() => {
  if (rule.value.deleted) {
    return t('homepage.rule.enable_rule');
  } else {
    return t('homepage.rule.edit_rule');
  }
});

const boxSize = computed(() => {
  if (rule.value.deleted) {
    return 'w-300';
  } else {
    return 'w-380';
  }
});
</script>

<template>
  <ab-popup
    v-model:show="show"
    :title="popupTitle"
    :css="`${boxSize} max-w-90vw`"
  >
    <div v-if="rule.deleted">
      <div>{{ $t('homepage.rule.enable_hit') }}</div>

      <div line my-8></div>

      <div f-cer gap-x-10>
        <ab-button size="small" type="warn" @click="() => emitEnable()">
          {{ $t('homepage.rule.yes_btn') }}
        </ab-button>
        <ab-button size="small" @click="() => close()">
          {{ $t('homepage.rule.no_btn') }}
        </ab-button>
      </div>
    </div>

    <div v-else space-y-12>
      <ab-rule v-model:rule="rule"></ab-rule>

      <div fx-cer justify-between gap-x-10>
        <ab-button size="small" @click="() => showForceCollectDialog(true)">
          {{ $t('homepage.rule.force_collect') }}
        </ab-button>
        <ab-button size="small" :loading="loading.rename" @click="rename">
          {{ $t('homepage.rule.rename') }}
        </ab-button>
        <div fx-cer justify-end gap-x-10>
          <ab-button-multi
            size="small"
            type="warn"
            :selections="[
              t('homepage.rule.delete'),
              t('homepage.rule.disable'),
            ]"
            @click="showDeleteFileDialog"
          />
          <ab-button size="small" @click="emitApply">
            {{ $t('homepage.rule.apply') }}
          </ab-button>
        </div>
      </div>
    </div>

    <ab-popup
      v-model:show="deleteFileDialog.show"
      :title="$t('homepage.rule.delete')"
    >
      <div>{{ $t('homepage.rule.delete_hit') }}</div>
      <div line my-8></div>

      <div f-cer gap-x-10>
        <ab-button size="small" type="warn" @click="() => emitdeleteFile(true)">
          {{ $t('homepage.rule.yes_btn') }}
        </ab-button>
        <ab-button size="small" @click="() => emitdeleteFile(false)">
          {{ $t('homepage.rule.no_btn') }}
        </ab-button>
      </div>
    </ab-popup>

    <ab-popup
      v-model:show="forceCollectDialog.show"
      :title="$t('homepage.rule.force_collect')"
    >
      <div>{{ $t('homepage.rule.force_collect_hit') }}</div>
      <div line my-8></div>

      <div f-cer gap-x-10>
        <ab-button
          size="small"
          type="warn"
          :loading="loading.collect"
          @click="forceCollect"
        >
          {{ $t('homepage.rule.yes_btn') }}
        </ab-button>
        <ab-button size="small" @click="() => showForceCollectDialog(false)">
          {{ $t('homepage.rule.no_btn') }}
        </ab-button>
      </div>
    </ab-popup>
  </ab-popup>
</template>
