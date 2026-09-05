import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from '@/app/router';

import './style/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />,
);
