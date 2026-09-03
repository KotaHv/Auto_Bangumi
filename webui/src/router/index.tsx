import { Navigate, createHashRouter } from 'react-router';
import LoginPage from '@/pages/login';
import RootLayout from '@/root-layout';
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
          const { default: IndexPage } = await import('@/pages/index');
          return {
            Component: () => (
              <RequireAuth>
                <IndexPage />
              </RequireAuth>
            ),
          };
        },
        children: [
          { index: true, element: <Navigate to="/bangumi" replace /> },
          {
            path: 'bangumi',
            lazy: () =>
              import('@/pages/index/bangumi').then(
                ({ default: Component }) => ({
                  Component,
                }),
              ),
          },
          {
            path: 'calendar',
            lazy: () =>
              import('@/pages/index/calendar').then(
                ({ default: Component }) => ({
                  Component,
                }),
              ),
          },
          {
            path: 'rss',
            lazy: () =>
              import('@/pages/index/rss').then(({ default: Component }) => ({
                Component,
              })),
          },
          { path: 'player', element: <RedirectPlayerIfJump /> },
          {
            path: 'downloader',
            lazy: () =>
              import('@/pages/index/downloader').then(
                ({ default: Component }) => ({
                  Component,
                }),
              ),
          },
          {
            path: 'log',
            lazy: () =>
              import('@/pages/index/log').then(({ default: Component }) => ({
                Component,
              })),
          },
          {
            path: 'config',
            lazy: () =>
              import('@/pages/index/config').then(({ default: Component }) => ({
                Component,
              })),
          },
        ],
      },
    ],
  },
]);
