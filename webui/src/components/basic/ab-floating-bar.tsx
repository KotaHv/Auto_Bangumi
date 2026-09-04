import * as React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AbFloatingBarPosition = 'top' | 'bottom';

interface AbFloatingBarProps extends React.ComponentProps<typeof Card> {
  position?: AbFloatingBarPosition;
}

const POSITION_CLASS: Record<AbFloatingBarPosition, string> = {
  top: 'mt-3',
  bottom: 'mb-[calc(12px+env(safe-area-inset-bottom))]',
};

export function AbFloatingBar({
  className,
  position = 'bottom',
  ...props
}: AbFloatingBarProps) {
  return (
    <Card
      className={cn(
        'bg-popover text-popover-foreground border-border flex shrink-0 flex-row items-center rounded-2xl border px-4 py-2 shadow-lg ring-0 [--card-spacing:0px]',
        POSITION_CLASS[position],
        className,
      )}
      {...props}
    />
  );
}
