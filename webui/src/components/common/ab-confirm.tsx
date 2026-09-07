import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AbPopup, type AbPopupWidth } from '@/components/common/ab-popup';

interface AbConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    <AbPopup
      title={title}
      open={open}
      onOpenChange={onOpenChange}
      titleCss="text-base"
      width={width}
      className="p-3"
    >
      <div className="-mt-1 flex flex-col gap-3">
        {children}

        <div className="flex items-center justify-center gap-2">
          <Button
            variant={confirmType === 'warn' ? 'destructive-solid' : 'brand'}
            className="min-w-16"
            loading={confirmLoading}
            onClick={onConfirm}
          >
            {confirmText ?? t('homepage.rule.confirm_btn')}
          </Button>

          <Button
            variant="outline"
            className="min-w-16"
            onClick={() => onOpenChange(false)}
          >
            {cancelText ?? t('homepage.rule.cancel_btn')}
          </Button>
        </div>
      </div>
    </AbPopup>
  );
}
