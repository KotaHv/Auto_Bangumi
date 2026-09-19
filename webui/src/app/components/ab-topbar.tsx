import { useLocation } from 'react-router';
import { AbAddRss } from '@/features/rss/components/ab-add-rss';
import { AbSearchBar } from './ab-search-bar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AbMobileSearch } from './ab-mobile-search';
import { AbTopbarMenu } from './ab-topbar-menu';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';

const ROUTE_TITLES: Record<string, string> = {
  '/bangumi': 'Bangumi List',
  '/rss': 'RSS',
  '/log': 'Log',
  '/config': 'Config',
};

export function AbTopbar() {
  const location = useLocation();

  return (
    <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger size="icon" className="-ml-1 md:hidden" />

      <div className="font-display flex shrink-0 items-center gap-2 text-base font-semibold tracking-wide">
        {ROUTE_TITLES[location.pathname] ?? ''}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <AbSearchBar className="hidden md:block" />

        <div className="flex items-center gap-1.5">
          <AbMobileSearch />
          <AbAddRss />
          <ThemeToggle />
          <LanguageToggle />
          <AbTopbarMenu />
        </div>
      </div>
    </header>
  );
}
