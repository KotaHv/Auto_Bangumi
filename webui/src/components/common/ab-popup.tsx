import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type AbPopupWidth = 'sm' | 'md' | 'lg' | 'xl';

const WIDTH_CLASS: Record<AbPopupWidth, string> = {
  sm: 'w-[280px]',
  md: 'w-[300px]',
  lg: 'w-[365px]',
  xl: 'w-[520px]',
};

interface AbPopupProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  maskClick?: boolean;
  width?: AbPopupWidth;
  className?: string;
  titleCss?: string;
  children?: ReactNode;
}

export function AbPopup({
  title,
  open,
  onOpenChange,
  onOpenChangeComplete,
  maskClick = true,
  width = 'md',
  className = '',
  titleCss = '',
  children,
}: AbPopupProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      disablePointerDismissal={!maskClick}
    >
      <DialogContent
        className={cn(WIDTH_CLASS[width], 'max-w-[92vw]', className)}
        showCloseButton={false}
        initialFocus={false}
      >
        <DialogHeader>
          <DialogTitle className={titleCss}>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
