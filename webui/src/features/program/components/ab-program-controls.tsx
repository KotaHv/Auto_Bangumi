import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, Power, RotateCw, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { returnUserLangMsg } from '@/lib/i18n';
import { message } from '@/lib/message';
import { apiProgram } from '../api';
import { programKeys } from '../queries';

export function AbProgramControls() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const programMutation = useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart' | 'shutdown') =>
      apiProgram[action](),
    onSuccess: async (data) => {
      message.success(returnUserLangMsg(data));
      await queryClient.invalidateQueries({ queryKey: programKeys.status() });
    },
  });

  const controlItems: {
    id: number;
    icon: LucideIcon;
    label: string;
    handle: () => void;
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
  ];

  return controlItems.map((item) => (
    <DropdownMenuItem key={item.id} onClick={item.handle}>
      <item.icon />
      {item.label}
    </DropdownMenuItem>
  ));
}
