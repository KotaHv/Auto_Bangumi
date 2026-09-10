import { useEffect, useState } from 'react';

const Desktop_BREAKPOINT = 1024;

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${Desktop_BREAKPOINT}px)`).matches
      : true,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${Desktop_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);

    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
