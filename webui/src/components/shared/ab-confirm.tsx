import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AbPopupWidth } from '@/components/shared/ab-popup';
import { cn } from 'cn';

const WIDTH_CLASS: Record<AbPopupWidth, string> = {
  sm: 'w-[280px]',
  md: 'w-[300px]',
  lg: 'w-[365px]',
  xl: 'w-[520px]',
};

interface AbConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  title: string;
  width?: AbPopupWidth;
  confirmType?: 'brand' | 'warn';
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  onConfirm?: () => void;
  children?: ReactNode;
}

export function AbConfirm({
  open,
  onOpenChange,
  onOpenChangeComplete,
  title,
  width = 'md',
  confirmType = 'brand',
  confirmText,
  cancelText,
  confirmLoading = false,
  onConfirm,
  children,
}: AbConfirmProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <AlertDialogContent
        className={cn(WIDTH_CLASS[width], 'max-w-[92vw]')}
        initialFocus={false}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{children}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="min-w-16">
            {cancelText ?? t('homepage.rule.cancel_btn')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={confirmType === 'warn' ? 'destructive-solid' : 'brand'}
            className="min-w-16"
            loading={confirmLoading}
            onClick={onConfirm}
          >
            {confirmText ?? t('homepage.rule.confirm_btn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
