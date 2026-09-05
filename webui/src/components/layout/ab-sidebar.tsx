import { Button } from '@/components/ui/button';
import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FileClock, House, LogOut, Play, Rss, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AbBrand } from '@/components/icons/ab-brand';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAppInfoStore } from '@/store/app-info';
import { useAuthStore } from '@/store/auth';

interface SidebarItem {
  id: number;
  icon: LucideIcon;
  label: string;
  path: string;
  hidden: boolean;
}

export function AbSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const running = useAppInfoStore((s) => s.running);
  const { setOpenMobile, toggleSidebar } = useSidebar();

  const items: SidebarItem[] = [
    {
      id: 1,
      icon: House,
      label: t('sidebar.homepage'),
      path: '/bangumi',
      hidden: false,
    },
    {
      id: 2,
      icon: Rss,
      label: t('sidebar.rss'),
      path: '/rss',
      hidden: false,
    },
    {
      id: 3,
      icon: Play,
      label: t('sidebar.player'),
      path: '/player',
      hidden: false,
    },
    {
      id: 4,
      icon: FileClock,
      label: t('sidebar.log'),
      path: '/log',
      hidden: false,
    },
    {
      id: 5,
      icon: Settings,
      label: t('sidebar.config'),
      path: '/config',
      hidden: false,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Button
          variant="ghost"
          aria-label="Toggle Sidebar"
          onClick={toggleSidebar}
        >
          <AbBrand running={running} />
          <span className="font-display text-base font-semibold tracking-[0.18em]">
            AUTOBANGUMI
          </span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) =>
                item.hidden ? null : (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      size="lg"
                      aria-label={item.label}
                      render={
                        <NavLink
                          to={item.path}
                          replace
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                      isActive={location.pathname === item.path}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              aria-label={t('sidebar.logout')}
              render={
                <button
                  onClick={() => {
                    setOpenMobile(false);
                    logout();
                  }}
                />
              }
              tooltip={t('sidebar.logout')}
            >
              <LogOut />
              <span>{t('sidebar.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
