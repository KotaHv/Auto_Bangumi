import { Navigate, createHashRouter } from 'react-router';
import LoginPage from '@/app/routes/login';
import RootLayout from '@/app/layouts/root-layout';
import {
  RequireAuth,
  RedirectIfLoggedIn,
  RedirectPlayerIfJump,
} from './guards';

export const router = createHashRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        path: 'login',
        element: (
          <RedirectIfLoggedIn>
            <LoginPage />
          </RedirectIfLoggedIn>
        ),
      },
      {
        path: '',
        lazy: async () => {
          const { default: AppLayout } =
            await import('@/app/layouts/app-layout');
          return {
            Component: () => (
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            ),
          };
        },
        children: [
          { index: true, element: <Navigate to="/bangumi" replace /> },
          {
            path: 'bangumi',
            lazy: () =>
              import('@/app/routes/bangumi').then(({ default: Component }) => ({
                Component,
              })),
          },
          {
            path: 'rss',
            lazy: () =>
              import('@/app/routes/rss').then(({ default: Component }) => ({
                Component,
              })),
          },
          { path: 'player', element: <RedirectPlayerIfJump /> },
          {
            path: 'log',
            lazy: () =>
              import('@/app/routes/log').then(({ default: Component }) => ({
                Component,
              })),
          },
          {
            path: 'config',
            lazy: () =>
              import('@/app/routes/config').then(({ default: Component }) => ({
                Component,
              })),
          },
        ],
      },
    ],
  },
]);
