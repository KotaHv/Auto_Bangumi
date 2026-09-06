import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiBangumi } from '@/api/bangumi';
import { apiDownload } from '@/api/download';
import { bangumiKeys } from '@/query/options';
import { message } from '@/lib/message';
import { returnUserLangMsg } from '@/i18n';
import { AbConfirm } from '@/components/common/ab-confirm';
import { AbPopup } from '@/components/common/ab-popup';
import { AbRule } from '@/components/rule/ab-rule';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { BangumiRule } from '#/bangumi';

interface AbEditRuleProps {
  rule: BangumiRule;
  onClose: () => void;
}

export function AbEditRule({ rule, onClose }: AbEditRuleProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draftRule, setDraftRule] = useState(() => rule);

  const [deleteFileDialog, setDeleteFileDialog] = useState<{
    show: boolean;
    type: 'disable' | 'delete';
    deleteFile: boolean;
  }>({ show: false, type: 'disable', deleteFile: false });

  const [forceCollectDialog, setForceCollectDialog] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: BangumiRule }) =>
      apiBangumi.updateRule(id, rule),
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onClose();
      void queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });
  const renameMutation = useMutation({
    mutationFn: apiBangumi.rename,
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onClose();
      void queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });
  const collectMutation = useMutation({
    mutationFn: apiDownload.forceCollect,
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onClose();
      void queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });
  const enableMutation = useMutation({
    mutationFn: apiBangumi.enableRule,
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onClose();
      void queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });
  const disableMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: boolean }) =>
      apiBangumi.disableRule(id, file),
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onClose();
      void queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: boolean }) =>
      apiBangumi.deleteRule(id, file),
    onSuccess: (data) => {
      message.success(returnUserLangMsg(data));
      onClose();
      void queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });

  function showDeleteFileDialog(type: 'disable' | 'delete') {
    setDeleteFileDialog({ show: true, type, deleteFile: false });
  }

  function enable() {
    enableMutation.mutate(draftRule.id);
  }

  function deleteOrDisableRule() {
    const variables = { id: draftRule.id, file: deleteFileDialog.deleteFile };
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
      show
      onShowChange={(v) => !v && onClose()}
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
      show
      onShowChange={(v) => !v && onClose()}
      width="xl"
      className="shadow-2xl"
    >
      <div>
        <AbRule rule={draftRule} onChange={setDraftRule} />

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center gap-2 sm:justify-between">
          <div className="flex gap-1">
            <Button variant="ghost" onClick={() => setForceCollectDialog(true)}>
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
            loading={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({ id: draftRule.id, rule: draftRule })
            }
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
        show={forceCollectDialog}
        onShowChange={setForceCollectDialog}
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
