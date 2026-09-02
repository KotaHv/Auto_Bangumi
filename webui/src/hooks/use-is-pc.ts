import { useEffect, useState } from 'react';

const PC_BREAKPOINT = 1024;

export function useIsPc() {
  const [isPc, setIsPc] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(min-width: ${PC_BREAKPOINT}px)`).matches
      : true,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${PC_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsPc(e.matches);

    mql.addEventListener('change', onChange);
    setIsPc(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isPc;
}
