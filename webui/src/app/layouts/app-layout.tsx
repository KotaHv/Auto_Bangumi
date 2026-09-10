import { Outlet } from 'react-router';
import { AbSidebar } from '@/app/components/ab-sidebar';
import { AbTopbar } from '@/app/components/ab-topbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AbSidebar />
      <SidebarInset className="h-dvh min-h-0 overflow-hidden">
        <AbTopbar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
