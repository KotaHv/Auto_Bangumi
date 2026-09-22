import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  CheckCircle2,
  CircleOff,
  EllipsisVertical,
  RefreshCw,
  Rss as RssIcon,
  Trash,
} from 'lucide-react';
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
import { cn } from 'cn';
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
  actionPending,
  pendingAction,
  selectedRSS,
  setSelectedRSS,
  enableSelected,
  disableSelected,
  deleteSelected,
  refreshSelected,
}: RSSLayoutProps) {
  const { t } = useTranslation();
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [openDisableConfirm, setOpenDisableConfirm] = useState(false);
  const [openBulkActions, setOpenBulkActions] = useState(false);

  const allChecked =
    rss.length > 0 && rss.every((item) => selectedRSS.includes(item.id));
  const enabledCount = rss.filter((item) => item.enabled).length;
  const disabledCount = rss.length - enabledCount;

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
            disabled={selectedRSS.length === 0 || actionPending}
            loading={pendingAction === 'enable'}
            onClick={enableSelected}
          >
            {t('rss.enable')}
          </Button>
          <DropdownMenu
            open={openBulkActions}
            onOpenChange={setOpenBulkActions}
          >
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={selectedRSS.length === 0 || actionPending}
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
              <DropdownMenuItem
                className="gap-1.5"
                closeOnClick={false}
                disabled={actionPending}
                onClick={async () => {
                  await refreshSelected();
                  setOpenBulkActions(false);
                }}
              >
                {pendingAction === 'refresh' ? <Spinner /> : <RefreshCw />}
                {t('rss.refresh')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-1.5"
                disabled={actionPending}
                onClick={() => setOpenDisableConfirm(true)}
              >
                <Ban />
                {t('rss.disable')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-1.5"
                variant="destructive"
                disabled={actionPending}
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
    <div className="mx-4 flex h-full min-h-0 flex-col">
      <AbFloatingBar position="top" className="w-full shadow-none">
        <CardContent className="divide-border/60 grid w-full grid-cols-3 gap-0 divide-x">
          <div
            className="text-brand flex min-w-0 items-center justify-center gap-1.5 px-2 first:pl-0"
            aria-label={`${t('rss.total')}: ${loading ? '-' : rss.length}`}
            title={t('rss.total')}
          >
            <RssIcon className="size-3.5 shrink-0" />
            <span className="font-display min-w-0 truncate text-sm font-semibold tabular-nums">
              {loading ? '-' : rss.length}
            </span>
          </div>

          <div
            className="flex min-w-0 items-center justify-center gap-1.5 px-2 text-emerald-600 dark:text-emerald-400"
            aria-label={`${t('rss.enabled_count')}: ${loading ? '-' : enabledCount}`}
            title={t('rss.enabled_count')}
          >
            <CheckCircle2 className="size-3.5 shrink-0" />
            <span className="font-display min-w-0 truncate text-sm font-semibold tabular-nums">
              {loading ? '-' : enabledCount}
            </span>
          </div>

          <div
            className="text-muted-foreground flex min-w-0 items-center justify-center gap-1.5 px-2 last:pr-0"
            aria-label={`${t('rss.disabled_count')}: ${loading ? '-' : disabledCount}`}
            title={t('rss.disabled_count')}
          >
            <CircleOff className="size-3.5 shrink-0" />
            <span className="font-display min-w-0 truncate text-sm font-semibold tabular-nums">
              {loading ? '-' : disabledCount}
            </span>
          </div>
        </CardContent>
      </AbFloatingBar>

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
        open={openDisableConfirm}
        onOpenChange={setOpenDisableConfirm}
        title={t('rss.disable')}
        confirmType="warn"
        confirmLoading={pendingAction === 'disable'}
        onConfirm={async () => {
          await disableSelected();
          setOpenDisableConfirm(false);
        }}
      >
        {t('rss.disable_hit')}
      </AbConfirm>

      <AbConfirm
        open={openDeleteConfirm}
        onOpenChange={setOpenDeleteConfirm}
        title={t('rss.delete')}
        confirmType="warn"
        confirmLoading={pendingAction === 'delete'}
        onConfirm={async () => {
          await deleteSelected();
          setOpenDeleteConfirm(false);
        }}
      >
        {t('rss.delete_hit')}
      </AbConfirm>
    </div>
  );
}
