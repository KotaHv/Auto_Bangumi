import { Outlet } from 'react-router';
import { AppProviders } from '@/app/providers';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function RootLayout() {
  return (
    <AppProviders>
      <TooltipProvider delay={300}>
        <div className="flex min-h-dvh">
          <Outlet />
        </div>
      </TooltipProvider>
    </AppProviders>
  );
}
