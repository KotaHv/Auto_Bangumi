import { Navigate, createHashRouter } from 'react-router';
import LoginPage from '@/pages/login';
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
              import('@/pages/bangumi').then(({ default: Component }) => ({
                Component,
              })),
          },
          {
            path: 'rss',
            lazy: () =>
              import('@/pages/rss').then(({ default: Component }) => ({
                Component,
              })),
          },
          { path: 'player', element: <RedirectPlayerIfJump /> },
          {
            path: 'log',
            lazy: () =>
              import('@/pages/log').then(({ default: Component }) => ({
                Component,
              })),
          },
          {
            path: 'config',
            lazy: () =>
              import('@/pages/config').then(({ default: Component }) => ({
                Component,
              })),
          },
        ],
      },
    ],
  },
]);
