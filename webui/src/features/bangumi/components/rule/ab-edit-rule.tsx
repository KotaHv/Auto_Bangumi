import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBangumi } from '../../api';
import { bangumiKeys } from '../../queries';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/lib/i18n';
import { AbConfirm } from '@/components/shared/ab-confirm';
import { AbPopup } from '@/components/shared/ab-popup';
import { AbRule } from './ab-rule';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { BangumiRule, PersistedBangumiRule } from '../../types';

interface AbEditRuleProps {
  rule: PersistedBangumiRule;
  onClose: () => void;
}

export function AbEditRule({ rule, onClose }: AbEditRuleProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [draftRule, setDraftRule] = useState<BangumiRule>(() => rule);

  const [deleteFileDialog, setDeleteFileDialog] = useState<{
    open: boolean;
    type: 'disable' | 'delete';
    deleteFile: boolean;
  }>({ open: false, type: 'disable', deleteFile: false });

  const [openForceCollectDialog, setOpenForceCollectDialog] = useState(false);

  function updateCachedBangumiItem(
    id: number,
    update: (item: PersistedBangumiRule) => PersistedBangumiRule,
  ) {
    queryClient.setQueryData<PersistedBangumiRule[]>(
      bangumiKeys.list(),
      (current) =>
        current?.map((item) => (item.id === id ? update(item) : item)),
    );
  }

  function removeCachedBangumiItem(id: number) {
    queryClient.setQueryData<PersistedBangumiRule[]>(
      bangumiKeys.list(),
      (current) => current?.filter((item) => item.id !== id),
    );
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: BangumiRule }) =>
      apiBangumi.updateRule(id, rule),
    onSuccess: (data, { id, rule }) => {
      message.success(returnUserLangMsg(data));
      updateCachedBangumiItem(id, () => ({ ...rule, id }));
      setOpen(false);
    },
  });
  const renameMutation = useMutation({
    mutationFn: apiBangumi.rename,
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      setOpen(false);
    },
  });
  const collectMutation = useMutation({
    mutationFn: apiBangumi.forceCollect,
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      setOpen(false);
    },
  });
  const enableMutation = useMutation({
    mutationFn: apiBangumi.enableRule,
    onSuccess: (data, id) => {
      message.success(returnUserLangMsg(data));
      updateCachedBangumiItem(id, (item) => ({ ...item, deleted: false }));
      setOpen(false);
    },
  });
  const disableMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: boolean }) =>
      apiBangumi.disableRule(id, file),
    onSuccess: (data, { id }) => {
      message.success(returnUserLangMsg(data));
      updateCachedBangumiItem(id, (item) => ({ ...item, deleted: true }));
      setOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: boolean }) =>
      apiBangumi.deleteRule(id, file),
    onSuccess: (data, { id }) => {
      message.success(returnUserLangMsg(data));
      removeCachedBangumiItem(id);
      setOpen(false);
    },
  });

  function openDeleteFileDialog(type: 'disable' | 'delete') {
    setDeleteFileDialog({ open: true, type, deleteFile: false });
  }

  function enable() {
    enableMutation.mutate(rule.id);
  }

  function deleteOrDisableRule() {
    const variables = { id: rule.id, file: deleteFileDialog.deleteFile };
    if (deleteFileDialog.type === 'disable') {
      disableMutation.mutate(variables);
    } else {
      deleteMutation.mutate(variables);
    }
  }

  function forceCollect() {
    collectMutation.mutate(draftRule);
  }

  function rename() {
    renameMutation.mutate(draftRule);
  }

  return draftRule.deleted ? (
    <AbConfirm
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(v) => !v && onClose()}
      title={t('homepage.rule.enable_rule')}
      width="sm"
      confirmLoading={enableMutation.isPending}
      onConfirm={enable}
    >
      {t('homepage.rule.enable_hit')}
    </AbConfirm>
  ) : (
    <AbPopup
      title={t('homepage.rule.edit_rule')}
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(v) => !v && onClose()}
      width="xl"
      className="shadow-2xl"
    >
      <AbRule rule={draftRule} onChange={setDraftRule} />

      <Separator />

      <div className="flex flex-wrap items-center gap-2 sm:justify-between">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            onClick={() => setOpenForceCollectDialog(true)}
          >
            {t('homepage.rule.force_collect')}
          </Button>

          <Button
            variant="ghost"
            loading={renameMutation.isPending}
            onClick={rename}
          >
            {t('homepage.rule.rename')}
          </Button>

          <Button
            variant="ghost"
            onClick={() => openDeleteFileDialog('disable')}
          >
            {t('homepage.rule.disable')}
          </Button>

          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => openDeleteFileDialog('delete')}
          >
            {t('homepage.rule.delete')}
          </Button>
        </div>

        <Button
          variant="brand"
          className="order-first h-10 w-full sm:order-last sm:h-8 sm:w-auto sm:min-w-20"
          loading={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({ id: rule.id, rule: draftRule })
          }
        >
          {t('homepage.rule.apply')}
        </Button>
      </div>

      <AbConfirm
        open={deleteFileDialog.open}
        onOpenChange={(v) => setDeleteFileDialog((s) => ({ ...s, open: v }))}
        title={
          deleteFileDialog.type === 'disable'
            ? t('homepage.rule.disable_hit')
            : t('homepage.rule.delete_hit')
        }
        confirmType={deleteFileDialog.type === 'delete' ? 'warn' : 'brand'}
        confirmLoading={disableMutation.isPending || deleteMutation.isPending}
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
        open={openForceCollectDialog}
        onOpenChange={setOpenForceCollectDialog}
        title={t('homepage.rule.force_collect')}
        width="sm"
        confirmLoading={collectMutation.isPending}
        onConfirm={forceCollect}
      >
        {t('homepage.rule.force_collect_hit')}
      </AbConfirm>
    </AbPopup>
  );
}
