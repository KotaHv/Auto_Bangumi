import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { returnUserLangMsg } from '@/lib/i18n';
import { message } from '@/lib/message';
import { apiBangumi } from '../api';
import { bangumiKeys } from '../queries';

export function AbRefreshPosterMenuItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refreshPosterMutation = useMutation({
    mutationFn: apiBangumi.refreshPoster,
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: bangumiKeys.list() });
    },
  });

  return (
    <DropdownMenuItem onClick={() => refreshPosterMutation.mutate()}>
      <RefreshCw />
      {t('topbar.refresh_poster')}
    </DropdownMenuItem>
  );
}
