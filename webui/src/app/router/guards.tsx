import { lazy, Suspense, useEffect } from 'react';
import { Navigate } from 'react-router';
import { usePlayerStore } from '@/features/player/model/store';

const PlayerPage = lazy(() => import('@/app/routes/player'));

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
