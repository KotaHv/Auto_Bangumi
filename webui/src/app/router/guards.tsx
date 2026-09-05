import { Navigate } from 'react-router';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { usePlayerStore } from '@/store/player';
import type { ReactNode } from 'react';

const PlayerPage = lazy(() => import('@/pages/player'));

export function RequireAuth({ children }: { children: ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function RedirectIfLoggedIn({ children }: { children: ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (isLoggedIn) {
    return <Navigate to="/bangumi" replace />;
  }
  return children;
}

export function RedirectPlayerIfJump() {
  const type = usePlayerStore((s) => s.type);
  const url = usePlayerStore((s) => s.url);

  useEffect(() => {
    if (type === 'jump' && url !== '') {
      window.open(url);
    }
  }, [type, url]);

  if (type === 'jump' && url !== '') {
    return <Navigate to="/bangumi" replace />;
  }
  return (
    <Suspense fallback={null}>
      <PlayerPage />
    </Suspense>
  );
}
