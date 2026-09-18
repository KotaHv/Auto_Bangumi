import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  CircleOff,
  ListFilter,
  Rss as RssIcon,
} from 'lucide-react';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { RSS } from '../types/rss';
import type { RSSLayoutProps } from '../types/page';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { AbRssLink } from './ab-rss-link';
import { AbRssTags } from './ab-rss-tags';

export function RSSDesktop({
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
  const hasSelection = selectedRSS.length > 0;

  const allChecked =
    rss.length > 0 && rss.every((item) => selectedRSS.includes(item.id));

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

  function renderSelectionCheckbox(rssItem: RSS) {
    return (
      <Checkbox
        className="data-checked:border-brand! data-checked:bg-brand! focus-visible:border-brand! focus-visible:ring-brand/40! data-checked:text-white!"
        checked={selectedRSS.includes(rssItem.id)}
        onCheckedChange={(checked) => toggleRow(rssItem.id, checked)}
        aria-label={`${t('rss.selectbox')} ${rssItem.name || '-'}`}
      />
    );
  }

  function renderBulkActions() {
    if (selectedRSS.length === 0) return null;

    return (
      <div className="bg-muted/30 border-border/70 flex flex-wrap items-center gap-2 border-t px-4 py-3 sm:justify-between sm:px-5">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <ListFilter className="size-3.5" />
          <span>{t('rss.selected_count', { count: selectedRSS.length })}</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            variant="brand"
            className="min-w-20"
            disabled={actionPending}
            loading={pendingAction === 'enable'}
            onClick={enableSelected}
          >
            {t('rss.enable')}
          </Button>
          <Button
            variant="ghost"
            disabled={actionPending}
            loading={pendingAction === 'refresh'}
            onClick={refreshSelected}
          >
            {t('rss.refresh')}
          </Button>
          <Button
            variant="ghost"
            disabled={actionPending}
            onClick={() => setOpenDisableConfirm(true)}
          >
            {t('rss.disable')}
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={actionPending}
            onClick={() => setOpenDeleteConfirm(true)}
          >
            {t('rss.delete')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex min-h-0 w-[86%] flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-xl">
                <RssIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">
                  {t('rss.total')}
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {loading ? '-' : rss.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">
                  {t('rss.enabled_count')}
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {loading ? '-' : rss.filter((item) => item.enabled).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl [--card-spacing:0px]">
            <CardContent className="flex items-center gap-3 px-4 py-3">
              <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                <CircleOff className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">
                  {t('rss.disabled_count')}
                </p>
                <p className="font-display mt-0.5 text-xl font-semibold">
                  {loading ? '-' : rss.filter((item) => !item.enabled).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full overflow-hidden rounded-2xl [--card-spacing:0px]">
          <CardContent className="px-4 py-2 **:data-[slot=table-container]:overflow-visible">
            {loading ? (
              <Empty className="min-h-64 border-0 p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                    <Spinner />
                  </EmptyMedia>
                  <EmptyTitle>{t('rss.loading')}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : rss.length === 0 ? (
              <Empty className="min-h-64 border-0 p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                    <RssIcon />
                  </EmptyMedia>
                  <EmptyTitle>{t('rss.empty')}</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <div
                className={cn(
                  'overflow-auto',
                  hasSelection
                    ? 'max-h-[calc(100dvh-16rem)]'
                    : 'max-h-[calc(100dvh-12rem)]',
                )}
              >
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-card sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[30%]">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            className="data-checked:border-brand! data-checked:bg-brand! focus-visible:border-brand! focus-visible:ring-brand/40! data-checked:text-white!"
                            checked={allChecked}
                            indeterminate={
                              selectedRSS.length > 0 && !allChecked
                            }
                            onCheckedChange={toggleAll}
                            aria-label={t('rss.select_all')}
                          />
                          <span>{t('rss.name')}</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-[50%] text-center">
                        {t('rss.url')}
                      </TableHead>
                      <TableHead className="w-[20%] text-right">
                        {t('rss.tags')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rss.map((item) => (
                      <TableRow
                        key={item.id}
                        className={
                          selectedRSS.includes(item.id) ? 'bg-brand/4' : ''
                        }
                      >
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            {renderSelectionCheckbox(item)}
                            <span
                              className="truncate font-medium"
                              title={item.name ?? undefined}
                            >
                              {item.name || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AbRssLink url={item.url} textClassName="truncate" />
                        </TableCell>
                        <TableCell className="text-right">
                          <AbRssTags
                            rss={item}
                            className="w-full justify-end"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {renderBulkActions()}
        </Card>
      </div>

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
