import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  CirclePlus,
  EllipsisVertical,
  MonitorPlay,
  Moon,
  Pause,
  Play,
  Power,
  RefreshCw,
  RotateCw,
  Search,
  Sun,
  SunMoon,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BangumiRule } from '@/types/bangumi';
import { ruleTemplate } from '@/constants/bangumi';
import { useTheme } from '@/hooks/use-theme';
import { AbSearchBar } from '@/components/search/ab-search-bar';
import { AbAddRss } from '@/components/rss/ab-add-rss';
import { AbChangeAccount } from '@/components/account/ab-change-account';
import { AbPlayerSettings } from '@/components/player/ab-player-settings';
import { LanguageIcon } from '@/components/icons/language-icon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { changeLocale } from '@/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBangumi } from '@/api/bangumi';
import { apiProgram } from '@/api/program';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/i18n';
import { bangumiKeys, programKeys } from '@/query/options';

const ROUTE_TITLES: Record<string, string> = {
  '/bangumi': 'Bangumi List',
  '/rss': 'RSS',
  '/player': 'Player',
  '/log': 'Log',
  '/config': 'Config',
};

function ThemeToggle() {
  const { mode, cycle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="toggle theme"
      title="toggle theme"
      onClick={cycle}
    >
      {mode === 'light' ? <Sun /> : mode === 'dark' ? <Moon /> : <SunMoon />}
    </Button>
  );
}

export function AbTopbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [showAccount, setShowAccount] = useState(false);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  const [showAddRSS, setShowAddRSS] = useState(false);
  const [searchRule, setSearchRule] = useState<BangumiRule>(ruleTemplate);
  const [showSearch, setShowSearch] = useState(false);

  const queryClient = useQueryClient();
  const programMutation = useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart' | 'shutdown') =>
      apiProgram[action](),
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: programKeys.status() });
    },
  });
  const refreshPosterMutation = useMutation({
    mutationFn: apiBangumi.refreshPoster,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });

  const controlItems: {
    id: number;
    icon: LucideIcon;
    label: string;
    handle?: () => unknown;
  }[] = [
    {
      id: 1,
      icon: Play,
      label: t('topbar.start'),
      handle: () => programMutation.mutate('start'),
    },
    {
      id: 2,
      icon: Pause,
      label: t('topbar.pause'),
      handle: () => programMutation.mutate('stop'),
    },
    {
      id: 3,
      icon: RotateCw,
      label: t('topbar.restart'),
      handle: () => programMutation.mutate('restart'),
    },
    {
      id: 4,
      icon: Power,
      label: t('topbar.shutdown'),
      handle: () => programMutation.mutate('shutdown'),
    },
    {
      id: 5,
      icon: RefreshCw,
      label: t('topbar.refresh_poster'),
      handle: () => refreshPosterMutation.mutate(),
    },
  ];

  function addSearchResult(bangumi: BangumiRule) {
    setShowAddRSS(true);
    setSearchRule(bangumi);
  }

  useEffect(() => {
    if (!showAddRSS) {
      window.setTimeout(() => setSearchRule(ruleTemplate), 300);
    }
  }, [showAddRSS]);

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger size="icon" className="-ml-1 md:hidden" />

      <div className="font-display flex shrink-0 items-center gap-2 text-base font-semibold tracking-wide">
        {ROUTE_TITLES[location.pathname] ?? ''}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <AbSearchBar
          onAddBangumi={addSearchResult}
          className="hidden md:block"
        />

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="search"
            title="search"
            onClick={() => setShowSearch(true)}
          >
            <Search />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="add rss"
            title="add rss"
            onClick={() => setShowAddRSS(true)}
          >
            <CirclePlus />
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            aria-label="change language"
            title="change language"
            onClick={changeLocale}
          >
            <LanguageIcon language={i18n.language} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="menu"
                  title="menu"
                />
              }
            >
              <EllipsisVertical />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={16} className="w-max">
              {controlItems.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => item.handle?.()}>
                  <item.icon />
                  {item.label}
                </DropdownMenuItem>
              ))}

              <DropdownMenuItem onClick={() => setShowPlayerSettings(true)}>
                <MonitorPlay />
                {t('player.settings_title')}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setShowAccount(true)}>
                <UserRound />
                {t('topbar.profile.title')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AbChangeAccount show={showAccount} onShowChange={setShowAccount} />

      <AbPlayerSettings
        show={showPlayerSettings}
        onShowChange={setShowPlayerSettings}
      />

      <AbAddRss
        show={showAddRSS}
        onShowChange={setShowAddRSS}
        rule={searchRule}
        onRuleChange={setSearchRule}
      />

      <Sheet open={showSearch} onOpenChange={setShowSearch}>
        <SheetContent
          side="top"
          showCloseButton={false}
          className="rounded-b-2xl px-4 pt-5 pb-6"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>搜索</SheetTitle>
          </SheetHeader>
          <div className="flex w-full justify-center">
            <AbSearchBar onAddBangumi={addSearchResult} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
