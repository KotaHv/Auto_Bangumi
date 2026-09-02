import { Outlet } from 'react-router';
import { AbSidebar } from '@/components/layout/ab-sidebar';
import { AbTopbar } from '@/components/layout/ab-topbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function IndexPage() {
  return (
    <SidebarProvider>
      <AbSidebar />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <AbTopbar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
