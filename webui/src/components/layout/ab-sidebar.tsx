import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Download,
  FileClock,
  House,
  LogOut,
  Play,
  Rss,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AbBrand } from '@/components/layout/ab-brand';
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
  const { setOpenMobile } = useSidebar();

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
      icon: CalendarDays,
      label: t('sidebar.calendar'),
      path: '/calendar',
      hidden: true,
    },
    {
      id: 3,
      icon: Rss,
      label: t('sidebar.rss'),
      path: '/rss',
      hidden: false,
    },
    {
      id: 4,
      icon: Play,
      label: t('sidebar.player'),
      path: '/player',
      hidden: false,
    },
    {
      id: 5,
      icon: Download,
      label: t('sidebar.downloader'),
      path: '/downloader',
      hidden: localStorage.getItem('enable_downloader_iframe') !== '1',
    },
    {
      id: 6,
      icon: FileClock,
      label: t('sidebar.log'),
      path: '/log',
      hidden: false,
    },
    {
      id: 7,
      icon: Settings,
      label: t('sidebar.config'),
      path: '/config',
      hidden: false,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <AbBrand />
          <span className="font-display text-base font-semibold tracking-[0.18em] group-data-[collapsible=icon]:hidden">
            AUTOBANGUMI
          </span>
        </div>
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
                      className="h-14 text-[15px]"
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
              className="h-14 text-[15px]"
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
