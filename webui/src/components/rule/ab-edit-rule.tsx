import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBangumiStore } from '@/store/bangumi';
import { AbConfirm } from '@/components/common/ab-confirm';
import { AbPopup } from '@/components/common/ab-popup';
import { AbRule } from '@/components/rule/ab-rule';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export function AbEditRule() {
  const { t } = useTranslation();

  const {
    editRule,
    closeEditPopup,
    setEditItem,
    updateRule,
    renameRule,
    forceCollectRule,
    enableRule,
    disableRule,
    deleteRule,
  } = useBangumiStore();

  const [deleteFileDialog, setDeleteFileDialog] = useState<{
    show: boolean;
    type: 'disable' | 'delete';
    deleteFile: boolean;
  }>({ show: false, type: 'disable', deleteFile: false });

  const [forceCollectDialog, setForceCollectDialog] = useState(false);

  const [loading, setLoading] = useState({
    enable: false,
    collect: false,
    rename: false,
    deleteFileYes: false,
  });

  const show = editRule.show;
  const rule = editRule.item;

  useEffect(() => {
    if (!show) {
      setDeleteFileDialog({ show: false, type: 'disable', deleteFile: false });
      setForceCollectDialog(false);
      setLoading((l) => ({ ...l, deleteFileYes: false }));
    }
  }, [show]);

  function showDeleteFileDialog(type: 'disable' | 'delete') {
    setDeleteFileDialog({ show: true, type, deleteFile: false });
  }

  function enable() {
    setLoading((l) => ({ ...l, enable: true }));
    void enableRule(rule.id).finally(() =>
      setLoading((l) => ({ ...l, enable: false })),
    );
  }

  function deleteOrDisableRule() {
    setLoading((l) => ({ ...l, deleteFileYes: true }));

    const action =
      deleteFileDialog.type === 'disable' ? disableRule : deleteRule;

    void action(rule.id, deleteFileDialog.deleteFile).finally(() => {
      setLoading((l) => ({ ...l, deleteFileYes: false }));
    });
  }

  function forceCollect() {
    setLoading((l) => ({ ...l, collect: true }));
    void forceCollectRule(rule).finally(() =>
      setLoading((l) => ({ ...l, collect: false })),
    );
  }

  function rename() {
    setLoading((l) => ({ ...l, rename: true }));
    void renameRule(rule).finally(() =>
      setLoading((l) => ({ ...l, rename: false })),
    );
  }

  return rule.deleted ? (
    <AbConfirm
      show={show}
      onShowChange={(v) => !v && closeEditPopup()}
      title={t('homepage.rule.enable_rule')}
      width="sm"
      confirmLoading={loading.enable}
      onConfirm={enable}
    >
      {t('homepage.rule.enable_hit')}
    </AbConfirm>
  ) : (
    <AbPopup
      title={t('homepage.rule.edit_rule')}
      show={show}
      onShowChange={(v) => !v && closeEditPopup()}
      width="xl"
      className="shadow-2xl"
    >
      <div>
        <AbRule rule={rule} onChange={setEditItem} />

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-2 sm:justify-between">
          <div className="flex gap-1">
            <Button variant="ghost" onClick={() => setForceCollectDialog(true)}>
              {t('homepage.rule.force_collect')}
            </Button>

            <Button variant="ghost" loading={loading.rename} onClick={rename}>
              {t('homepage.rule.rename')}
            </Button>

            <Button
              variant="ghost"
              onClick={() => showDeleteFileDialog('disable')}
            >
              {t('homepage.rule.disable')}
            </Button>

            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => showDeleteFileDialog('delete')}
            >
              {t('homepage.rule.delete')}
            </Button>
          </div>

          <Button
            variant="brand"
            className="order-first h-10 w-full sm:order-last sm:h-8 sm:w-auto sm:min-w-20"
            onClick={() => updateRule(rule.id, rule)}
          >
            {t('homepage.rule.apply')}
          </Button>
        </div>
      </div>

      <AbConfirm
        show={deleteFileDialog.show}
        onShowChange={(v) => setDeleteFileDialog((s) => ({ ...s, show: v }))}
        title={
          deleteFileDialog.type === 'disable'
            ? t('homepage.rule.disable_hit')
            : t('homepage.rule.delete_hit')
        }
        confirmType={deleteFileDialog.type === 'delete' ? 'warn' : 'brand'}
        confirmLoading={loading.deleteFileYes}
        onConfirm={deleteOrDisableRule}
      >
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={deleteFileDialog.deleteFile}
            onCheckedChange={(deleteFile) =>
              setDeleteFileDialog((s) => ({ ...s, deleteFile }))
            }
          />
          <span>{t('homepage.rule.delete_file')}</span>
        </label>
      </AbConfirm>

      <AbConfirm
        show={forceCollectDialog}
        onShowChange={setForceCollectDialog}
        title={t('homepage.rule.force_collect')}
        width="sm"
        confirmLoading={loading.collect}
        onConfirm={forceCollect}
      >
        {t('homepage.rule.force_collect_hit')}
      </AbConfirm>
    </AbPopup>
  );
}
