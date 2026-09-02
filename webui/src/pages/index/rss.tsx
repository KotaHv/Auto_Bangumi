import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AbButton } from '@/components/basic/ab-button';
import { AbContainer } from '@/components/ab-container';
import { AbTag } from '@/components/basic/ab-tag';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRSSStore } from '@/store/rss';
import type { RSS } from '#/rss';

export default function RSSPage() {
  const { t } = useTranslation();

  const rss = useRSSStore((s) => s.rss);
  const selectedRSS = useRSSStore((s) => s.selectedRSS);
  const setSelectedRSS = useRSSStore((s) => s.setSelectedRSS);
  const getAll = useRSSStore((s) => s.getAll);
  const enableSelected = useRSSStore((s) => s.enableSelected);
  const disableSelected = useRSSStore((s) => s.disableSelected);
  const deleteSelected = useRSSStore((s) => s.deleteSelected);

  useEffect(() => {
    getAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allChecked =
    rss.length > 0 && rss.every((item) => selectedRSS.includes(item.id));

  function toggleAll(checked: boolean) {
    setSelectedRSS(checked ? rss.map((item) => item.id) : []);
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedRSS(
      checked ? [...selectedRSS, id] : selectedRSS.filter((i) => i !== id),
    );
  }

  function renderStatus(rssItem: RSS) {
    return (
      <div key={rssItem.id} className="flex justify-end gap-2">
        {rssItem.parser && <AbTag type="primary" title={rssItem.parser} />}
        {rssItem.aggregate && <AbTag type="primary" title="aggregate" />}
        {rssItem.enabled ? (
          <AbTag type="active" title="active" />
        ) : (
          <AbTag type="inactive" title="inactive" />
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex flex-col gap-4">
        <AbContainer title={t('rss.title')}>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>{t('rss.name')}</TableHead>
                  <TableHead className="text-center">{t('rss.url')}</TableHead>
                  <TableHead className="text-right">
                    {t('rss.status')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rss.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRSS.includes(item.id)}
                        onCheckedChange={(checked) =>
                          toggleRow(item.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="max-w-52 truncate" title={item.name}>
                      {item.name}
                    </TableCell>
                    <TableCell
                      className="max-w-[400px] truncate text-center"
                      title={item.url}
                    >
                      {item.url}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderStatus(item)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {selectedRSS.length > 0 && (
            <>
              <div className="bg-border my-3 h-px" />

              <div className="flex justify-end gap-2">
                <AbButton size="small" onClick={enableSelected}>
                  {t('rss.enable')}
                </AbButton>

                <AbButton size="small" onClick={disableSelected}>
                  {t('rss.disable')}
                </AbButton>

                <AbButton type="warn" size="small" onClick={deleteSelected}>
                  {t('rss.delete')}
                </AbButton>
              </div>
            </>
          )}
        </AbContainer>
      </div>
    </div>
  );
}
