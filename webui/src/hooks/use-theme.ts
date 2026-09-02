import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

const THEME_KEY = 'theme';
const MODES: ThemeMode[] = ['light', 'dark', 'auto'];

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'auto' && systemDark());
  document.documentElement.classList.toggle('dark', dark);
}

function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'auto';
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getThemeMode() === 'auto') applyTheme('auto');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const cycle = useCallback(() => {
    setMode((mode) => {
      const isDark = systemDark();
      if (mode === 'light') return !isDark ? 'auto' : 'dark';
      if (mode === 'dark') return isDark ? 'auto' : 'light';

      return isDark ? 'light' : 'dark';
    });
  }, []);

  return { mode, setMode, cycle };
}
