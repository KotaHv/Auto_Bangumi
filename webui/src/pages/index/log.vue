<script lang="ts" setup>
definePage({
  name: 'Log',
});

const { onUpdate, offUpdate, reset, copy, getLog } = useLogStore();
const { log } = storeToRefs(useLogStore());
const { getConfig, getSettingGroup } = useConfigStore();
const logSetting = getSettingGroup('log');

const formatLog = computed(() => {
  const lines = log.value
    .trim()
    .split('\n')
    .filter((i) => i !== '');
  const startIndex = lines.findIndex((i) => /Version/.test(i));
  const logs = lines.slice(startIndex === -1 ? 0 : startIndex);

  const list: Array<{
    index: number;
    date: string;
    type: string;
    module: string;
    content: string;
  }> = [];

  for (const line of logs) {
    const parts = line.split('|');
    if (parts.length >= 3) {
      const [module, ...contents] = parts.slice(2).join('|').split('-');
      list.push({
        index: list.length,
        date: parts[0].trim(),
        type: parts[1].trim(),
        module: module.trim(),
        content: contents.join('-').trim(),
      });
    } else if (list.length > 0) {
      list[list.length - 1].content += `\n${line}`;
    } else {
      list.push({
        index: list.length,
        date: '',
        type: '',
        module: '',
        content: line,
      });
    }
  }

  return list;
});

function typeColor(type: string) {
  const M = {
    INFO: '#4e3c94',
    WARNING: '#A76E18',
    ERROR: '#C70E0E',
    DEBUG: '#A0A0A0',
  };
  return M[type];
}

const logContainer = ref<HTMLElement | null>(null);

function backToBottom() {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

onActivated(() => {
  getConfig();
  onUpdate();

  if (log.value) {
    backToBottom();
  } else {
    watchOnce(log, () => {
      nextTick(() => {
        backToBottom();
      });
    });
  }
});

onDeactivated(() => {
  offUpdate();
});
</script>

<template>
  <div overflow-auto mt-12 flex-grow>
    <ab-container :title="$t('log.title')">
      <div
        ref="logContainer"
        rounded-10
        border="1 solid black"
        overflow-auto
        p-10
        max-h-60vh
        min-h-20vh
      >
        <div v-if="logSetting.debug_enable" min-w-450>
          <template v-for="i in formatLog" :key="i.index">
            <div
              p="y-10"
              leading="1.5em"
              border="0 b-1 solid"
              last:border-b-0
              flex="~ items-center gap-20"
              :style="{ color: typeColor(i.type) }"
            >
              <div flex="~ col items-center gap-10" whitespace-nowrap>
                <div text="center">{{ i.type }}</div>
                <div>[{{ i.date }}]</div>
              </div>
              <div flex-1 break-all style="color: #73bccd">
                {{ i.module }}
              </div>
              <div flex-1 break-all whitespace-pre-wrap>{{ i.content }}</div>
            </div>
          </template>
        </div>
        <div v-else min-w-450>
          <template v-for="i in formatLog" :key="i.index">
            <div
              p="y-10"
              leading="1.5em"
              border="0 b-1 solid"
              last:border-b-0
              flex="~ items-center gap-20"
              :style="{ color: typeColor(i.type) }"
            >
              <div flex="~ col items-center gap-10" whitespace-nowrap>
                <div text="center">{{ i.type }}</div>
                <div>[{{ i.date }}]</div>
              </div>

              <div flex-1 break-all whitespace-pre-wrap>{{ i.content }}</div>
            </div>
          </template>
        </div>
      </div>

      <div flex="~ justify-end gap-x-10" mt-12>
        <ab-button size="small" @click="getLog">
          {{ $t('log.update_now') }}
        </ab-button>

        <ab-button type="warn" size="small" @click="reset">
          {{ $t('log.reset') }}
        </ab-button>

        <ab-button size="small" @click="copy">
          {{ $t('log.copy') }}
        </ab-button>
      </div>
    </ab-container>
  </div>
</template>
