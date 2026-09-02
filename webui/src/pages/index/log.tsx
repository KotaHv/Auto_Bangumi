import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbButton } from '@/components/basic/ab-button';
import { AbContainer } from '@/components/ab-container';
import { startLogPolling, stopLogPolling, useLogStore } from '@/store/log';
import { useConfigStore } from '@/store/config';

interface LogLine {
  index: number;
  date: string;
  type: string;
  module: string;
  content: string;
}

function typeColor(type: string) {
  const M: Record<string, string> = {
    INFO: '#4e3c94',
    WARNING: '#A76E18',
    ERROR: '#C70E0E',
    DEBUG: '#A0A0A0',
  };
  return M[type];
}

export default function LogPage() {
  const { t } = useTranslation();

  const log = useLogStore((s) => s.log);
  const getLog = useLogStore((s) => s.getLog);
  const reset = useLogStore((s) => s.reset);
  const copy = useLogStore((s) => s.copy);

  const debugEnable = useConfigStore((s) => s.config.log.debug_enable);
  const getConfig = useConfigStore((s) => s.getConfig);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  function backToBottom() {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }

  const formatLog = useMemo<LogLine[]>(() => {
    const lines = log
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
  }, [log]);

  useEffect(() => {
    getConfig();
    startLogPolling();

    if (log) {
      backToBottom();
    } else {
      setScrolled(false);
    }

    return () => stopLogPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!scrolled && log) {
      setScrolled(true);
      requestAnimationFrame(backToBottom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex flex-col gap-4">
        <AbContainer title={t('log.title')}>
          <div
            ref={logContainerRef}
            className="bg-muted/20 max-h-[60vh] min-h-[20vh] overflow-auto rounded-lg border p-3"
          >
            <div className="min-w-[450px]">
              {formatLog.map((i) => (
                <div
                  key={i.index}
                  className={`flex items-center gap-5 border-b py-2 leading-[1.5em] last:border-b-0 ${
                    debugEnable ? '' : ''
                  }`}
                  style={{ color: typeColor(i.type), borderColor: 'inherit' }}
                >
                  <div className="flex shrink-0 flex-col items-center gap-2.5 whitespace-nowrap">
                    <div className="text-center">{i.type}</div>
                    <div>[{i.date}]</div>
                  </div>

                  {debugEnable && (
                    <div
                      className="flex-1 break-all"
                      style={{ color: '#73bccd' }}
                    >
                      {i.module}
                    </div>
                  )}

                  <div className="flex-1 break-all whitespace-pre-wrap">
                    {i.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <AbButton size="small" onClick={getLog}>
              {t('log.update_now')}
            </AbButton>

            <AbButton type="warn" size="small" onClick={reset}>
              {t('log.reset')}
            </AbButton>

            <AbButton size="small" onClick={copy}>
              {t('log.copy')}
            </AbButton>
          </div>
        </AbContainer>
      </div>
    </div>
  );
}
