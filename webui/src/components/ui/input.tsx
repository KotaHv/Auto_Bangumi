import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@/lib/utils';

export type InputVariant =
  'default' | 'large' | 'pill' | 'title' | 'search' | 'tag';

function Input({
  className,
  type,
  variant = 'default',
  ...props
}: React.ComponentProps<'input'> & { variant?: InputVariant }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        variant === 'large' && 'h-10',
        variant === 'pill' &&
          'bg-card focus-visible:border-brand h-12 rounded-full px-5 text-base shadow-none placeholder:text-base md:text-base md:placeholder:text-base dark:bg-white/5',
        variant === 'title' &&
          'font-display h-6 rounded-none border-0 bg-transparent px-0 pb-0.5 font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-lg dark:bg-transparent',
        variant === 'search' &&
          'h-10 min-w-0 flex-1 self-center rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-8 dark:bg-transparent dark:hover:bg-transparent',
        variant === 'tag' &&
          'h-auto min-h-6 w-20 rounded-md border-dashed bg-transparent px-2 text-xs outline-none',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
