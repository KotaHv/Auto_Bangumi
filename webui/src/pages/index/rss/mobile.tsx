import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, EllipsisVertical, Trash, RefreshCw, Ban } from 'lucide-react';
import { AbButton } from '@/components/basic/ab-button';
import { AbConfirm } from '@/components/ab-confirm';
import { AbTag } from '@/components/basic/ab-tag';
import { message } from '@/components/message';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { copyText } from '@/lib/clipboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { RSS } from '#/rss';
import type { RSSLayoutProps } from './types';

export function RSSMobile({
  rss,
  selectedRSS,
  setSelectedRSS,
  enableSelected,
  disableSelected,
  deleteSelected,
  refreshSelected,
}: RSSLayoutProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  function renderTags(rssItem: RSS) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {rssItem.parser && <AbTag type="primary" title={rssItem.parser} />}
        {rssItem.aggregate && (
          <AbTag type="primary" title={t('rss.aggregate')} />
        )}
        {rssItem.enabled ? (
          <AbTag type="active" title="active" />
        ) : (
          <AbTag type="inactive" title="inactive" />
        )}
      </div>
    );
  }

  async function copyRssLink(url: string) {
    if (await copyText(url)) {
      message.success(t('notify.copy_success'));
    } else {
      message.error(t('notify.copy_failed'));
    }
  }

  function renderCopyButton(url: string) {
    return (
      <button
        type="button"
        aria-label={t('notify.copy')}
        title={t('notify.copy')}
        className="text-brand/70 hover:text-brand focus-visible:ring-brand/40 flex size-7 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2"
        onClick={() => copyRssLink(url)}
      >
        <Copy className="size-3.5" />
      </button>
    );
  }

  function renderBulkActions() {
    return (
      <div className="bg-popover text-popover-foreground border-border flex min-h-(--config-action-bar-space) w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 shadow-lg">
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <Checkbox
            className="data-checked:border-brand! data-checked:bg-brand! focus-visible:border-brand! focus-visible:ring-brand/40! data-checked:text-white!"
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
          <AbButton
            type="brand"
            size="normal"
            className="px-3"
            disabled={selectedRSS.length === 0}
            onClick={enableSelected}
          >
            {t('rss.enable')}
          </AbButton>
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
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash />
                {t('rss.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {rss.length === 0 ? (
          <Empty className="min-h-64 border-0 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-brand/10 text-brand">
                <span className="text-sm">RSS</span>
              </EmptyMedia>
              <EmptyTitle>{t('rss.empty')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {rss.map((item) => (
              <Card
                key={item.id}
                className={`rounded-2xl [--card-spacing:0px] ${selectedRSS.includes(item.id) ? 'border-brand/40 bg-brand/4' : ''}`}
              >
                <CardContent className="relative p-4">
                  <div className="absolute top-4 right-4">
                    <Checkbox
                      className="data-checked:border-brand! data-checked:bg-brand! focus-visible:border-brand! focus-visible:ring-brand/40! data-checked:text-white!"
                      checked={selectedRSS.includes(item.id)}
                      onCheckedChange={(checked) => toggleRow(item.id, checked)}
                      aria-label={`${t('rss.selectbox')} ${item.name}`}
                    />
                  </div>

                  <h2 className="pr-8 text-sm font-semibold wrap-break-word">
                    {item.name || '-'}
                  </h2>
                  <div className="text-muted-foreground bg-muted/50 mt-3 flex min-w-0 items-center gap-1 rounded-lg px-2 py-1">
                    <span
                      className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed break-all"
                      title={item.url}
                    >
                      {item.url}
                    </span>
                    {renderCopyButton(item.url)}
                  </div>
                  <div className="mt-3">{renderTags(item)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-[calc(8px+env(safe-area-inset-bottom))]">
        {renderBulkActions()}
      </div>

      <AbConfirm
        show={showDeleteConfirm}
        onShowChange={setShowDeleteConfirm}
        title={t('rss.delete')}
        confirmType="warn"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteSelected();
        }}
      >
        {t('rss.delete_hit')}
      </AbConfirm>
    </div>
  );
}
