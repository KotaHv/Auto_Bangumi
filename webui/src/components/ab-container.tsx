import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

const FLUSH_CARD = { '--card-spacing': '0px' } as CSSProperties;

interface AbContainerProps {
  title: string;
  className?: string;
  titleRight?: ReactNode;
  children?: ReactNode;
}

export function AbContainer({
  title,
  className = '',
  titleRight,
  children,
}: AbContainerProps) {
  return (
    <Card style={FLUSH_CARD} className={cn('overflow-hidden', className)}>
      <CardHeader className="flex min-h-11 flex-row items-center justify-between gap-4 border-b px-5 py-2.5">
        <CardTitle className="font-display text-brand text-xs font-semibold tracking-[0.18em] uppercase">
          {title}
        </CardTitle>
        {titleRight}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
