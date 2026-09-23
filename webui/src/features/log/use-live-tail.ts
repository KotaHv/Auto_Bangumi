import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { LogFilters } from './types';
import { LogTailSession } from './live-tail';

export function useLiveTail(filters: LogFilters, active: boolean) {
  const sessionRef = useRef<LogTailSession | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = new LogTailSession();
  }
  const session = sessionRef.current;
  const stableFilters = useMemo(
    () => ({
      level: filters.level,
      start: filters.start,
      end: filters.end,
      module: filters.module,
      query: filters.query,
    }),
    [filters.level, filters.start, filters.end, filters.module, filters.query],
  );

  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );

  useEffect(() => {
    session.setFilters(stableFilters);
  }, [session, stableFilters]);

  useEffect(() => {
    session.setActive(active);
    return () => session.setActive(false);
  }, [session, active]);

  useEffect(() => () => session.dispose(), [session]);

  return {
    ...snapshot,
    pause: () => session.pause(),
    resume: () => session.resume(),
    retry: () => session.retry(),
    clearAndReconnect: () => session.clearAndReconnect(),
  };
}
