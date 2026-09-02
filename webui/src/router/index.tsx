import { Navigate, createHashRouter } from 'react-router';
import LoginPage from '@/pages/login';
import IndexPage from '@/pages/index';
import BangumiPage from '@/pages/index/bangumi';
import CalendarPage from '@/pages/index/calendar';
import ConfigPage from '@/pages/index/config';
import DownloaderPage from '@/pages/index/downloader';
import LogPage from '@/pages/index/log';
import RSSPage from '@/pages/index/rss';
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
        element: (
          <RequireAuth>
            <IndexPage />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/bangumi" replace /> },
          { path: 'bangumi', Component: BangumiPage },
          { path: 'calendar', Component: CalendarPage },
          { path: 'rss', Component: RSSPage },
          { path: 'player', element: <RedirectPlayerIfJump /> },
          { path: 'downloader', Component: DownloaderPage },
          { path: 'log', Component: LogPage },
          { path: 'config', Component: ConfigPage },
        ],
      },
    ],
  },
]);
