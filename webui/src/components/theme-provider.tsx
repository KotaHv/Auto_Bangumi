import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
};

const THEME_KEY = 'theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'auto' && systemDark());
  document.documentElement.classList.toggle('dark', dark);
}

function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto'
    ? stored
    : 'auto';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((currentMode) => {
      const isDark = systemDark();
      if (currentMode === 'light') return !isDark ? 'auto' : 'dark';
      if (currentMode === 'dark') return isDark ? 'auto' : 'light';

      return isDark ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(() => ({ mode, setMode, cycle }), [mode, cycle]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
