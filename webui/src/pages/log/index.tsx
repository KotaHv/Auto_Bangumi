import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startLogPolling, stopLogPolling, useLogStore } from '@/store/log';
import { useConfigStore } from '@/store/config';
import { useIsDesktop } from '@/hooks/use-desktop';
import { AbConfirm } from '@/components/common/ab-confirm';
import { LogMobile } from './mobile';
import { LogDesktop } from './desktop';
import type { LogLevelFilter, LogLine, LogLineLimit } from './types';

export default function LogPage() {
  const { t } = useTranslation();
  const log = useLogStore((s) => s.log);
  const loaded = useLogStore((s) => s.loaded);
  const loading = useLogStore((s) => s.loading);
  const resetting = useLogStore((s) => s.resetting);
  const lineLimit = useLogStore((s) => s.lineLimit);
  const setLineLimit = useLogStore((s) => s.setLineLimit);
  const getLog = useLogStore((s) => s.getLog);
  const reset = useLogStore((s) => s.reset);
  const copy = useLogStore((s) => s.copy);

  const debugEnable = useConfigStore((s) => s.config.log.debug_enable);
  const getConfig = useConfigStore((s) => s.getConfig);
  const isDesktop = useIsDesktop();

  const logContainerRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevelFilter>('ALL');
  const [pollingActive, setPollingActive] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const deferredLog = useDeferredValue(log);

  function backToBottom() {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }

  const formatLog = useMemo<LogLine[]>(() => {
    const lines = deferredLog
      .trim()
      .split('\n')
      .filter((i) => i !== '');
    const startIndex = lines.findIndex((i) => /Version/.test(i));
    const logs = lines.slice(startIndex === -1 ? 0 : startIndex);

    const list: LogLine[] = [];

    for (const line of logs) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        const [moduleName, ...contents] = parts.slice(2).join('|').split('-');
        list.push({
          index: list.length,
          date: parts[0].trim(),
          type: parts[1].trim(),
          module: moduleName.trim(),
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
  }, [deferredLog]);

  const visibleLog = useMemo(
    () =>
      filterLevel === 'ALL'
        ? formatLog
        : formatLog.filter((item) => item.type === filterLevel),
    [filterLevel, formatLog],
  );

  useEffect(() => {
    getConfig();
    startLogPolling();
    setPollingActive(true);

    if (log) {
      backToBottom();
    } else {
      setScrolled(false);
    }

    return () => stopLogPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!scrolled && deferredLog) {
      setScrolled(true);
      requestAnimationFrame(backToBottom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredLog]);

  function togglePolling() {
    if (pollingActive) {
      stopLogPolling();
      setPollingActive(false);
    } else {
      startLogPolling();
      setPollingActive(true);
    }
  }

  function changeLineLimit(limit: LogLineLimit) {
    setLineLimit(limit);
    void getLog(limit);
  }

  function openResetConfirm() {
    setShowResetConfirm(true);
  }

  const props = {
    log: formatLog,
    visibleLog,
    loaded,
    loading,
    debugEnable,
    filterLevel,
    setFilterLevel,
    lineLimit,
    setLineLimit: changeLineLimit,
    pollingActive,
    togglePolling,
    logContainerRef,
    getLog,
    onReset: openResetConfirm,
    copy,
  };

  return (
    <>
      {isDesktop ? <LogDesktop {...props} /> : <LogMobile {...props} />}
      <AbConfirm
        show={showResetConfirm}
        onShowChange={setShowResetConfirm}
        title={t('log.reset')}
        confirmType="warn"
        confirmLoading={resetting}
        onConfirm={async () => {
          await reset();
          setShowResetConfirm(false);
        }}
      >
        {t('log.reset_confirm')}
      </AbConfirm>
    </>
  );
}
