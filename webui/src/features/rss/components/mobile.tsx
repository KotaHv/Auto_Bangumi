import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EllipsisVertical, Trash, RefreshCw, Ban } from 'lucide-react';
import { AbFloatingBar } from '@/components/shared/ab-floating-bar';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { RSSLayoutProps } from '../types/page';
import { AbRssLink } from './ab-rss-link';
import { AbRssTags } from './ab-rss-tags';

export function RSSMobile({
  rss,
  loading,
  selectedRSS,
  setSelectedRSS,
  enableSelected,
  disableSelected,
  deleteSelected,
  refreshSelected,
}: RSSLayoutProps) {
  const { t } = useTranslation();
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  const allChecked =
    rss.length > 0 && rss.every((item) => selectedRSS.includes(item.id));

  const checkboxClassName =
    'data-checked:border-brand! data-checked:bg-brand! focus-visible:border-brand! focus-visible:ring-brand/40! data-checked:text-white!';

  function toggleAll(checked: boolean) {
    setSelectedRSS(checked ? rss.map((item) => item.id) : []);
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedRSS(
      checked
        ? selectedRSS.includes(id)
          ? selectedRSS
          : [...selectedRSS, id]
        : selectedRSS.filter((i) => i !== id),
    );
  }

  function renderBulkActions() {
    return (
      <AbFloatingBar position="bottom" className="justify-between gap-3">
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <Checkbox
            className={checkboxClassName}
            checked={allChecked}
            indeterminate={selectedRSS.length > 0 && !allChecked}
            onCheckedChange={toggleAll}
            aria-label={t('rss.select_all')}
          />
          <span className="truncate text-sm">
            {selectedRSS.length > 0
              ? t('rss.selected_count', { count: selectedRSS.length })
              : t('rss.select_all')}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="brand"
            className="px-3"
            disabled={selectedRSS.length === 0}
            onClick={enableSelected}
          >
            {t('rss.enable')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={selectedRSS.length === 0}
                  aria-label={t('rss.more')}
                  title={t('rss.more')}
                />
              }
            >
              <EllipsisVertical className="size-auto" size={24} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={18}
              className="w-auto min-w-28"
            >
              <DropdownMenuItem className="gap-1.5" onClick={refreshSelected}>
                <RefreshCw />
                {t('rss.refresh')}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-1.5" onClick={disableSelected}>
                <Ban />
                {t('rss.disable')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-1.5"
                variant="destructive"
                onClick={() => setOpenDeleteConfirm(true)}
              >
                <Trash />
                {t('rss.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </AbFloatingBar>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-4">
      <div className="no-scrollbar my-3 min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain">
        {loading ? (
          <Empty className="h-full min-h-0 border-0 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                <Spinner />
              </EmptyMedia>
              <EmptyTitle>{t('rss.loading')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : rss.length === 0 ? (
          <Empty className="h-full min-h-0 border-0 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                <span className="text-sm">RSS</span>
              </EmptyMedia>
              <EmptyTitle>{t('rss.empty')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          rss.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'border-border rounded-2xl [--card-spacing:0px]',
                selectedRSS.includes(item.id) && 'border-brand/40 bg-brand/4',
              )}
            >
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-sm font-semibold wrap-break-word">
                    {item.name || '-'}
                  </h2>
                  <Checkbox
                    className={cn(checkboxClassName, 'mt-0.5 shrink-0')}
                    checked={selectedRSS.includes(item.id)}
                    onCheckedChange={(checked) => toggleRow(item.id, checked)}
                    aria-label={`${t('rss.selectbox')} ${item.name || '-'}`}
                  />
                </div>
                <div className="mt-3">
                  <AbRssLink
                    url={item.url}
                    textClassName="text-[11px] leading-relaxed break-all"
                  />
                </div>
                <div className="mt-3">
                  <AbRssTags rss={item} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {renderBulkActions()}

      <AbConfirm
        open={openDeleteConfirm}
        onOpenChange={setOpenDeleteConfirm}
        title={t('rss.delete')}
        confirmType="warn"
        onConfirm={() => {
          setOpenDeleteConfirm(false);
          deleteSelected();
        }}
      >
        {t('rss.delete_hit')}
      </AbConfirm>
    </div>
  );
}
