import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function AbPillInput({
  trailing,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { trailing?: React.ReactNode }) {
  return (
    <div className="border-input bg-card focus-within:border-brand focus-within:ring-brand/20 dark:focus-within:ring-brand/25 flex h-12 w-full items-center rounded-full border transition-colors focus-within:ring-2 dark:bg-white/5">
      <Input
        {...props}
        className={cn(
          'h-full min-w-0 flex-1 rounded-full border-0 bg-transparent px-5 text-base shadow-none outline-none placeholder:text-base focus-visible:border-transparent focus-visible:ring-0 md:text-base md:placeholder:text-base dark:bg-transparent',
          className,
        )}
      />
      {trailing && (
        <div className="flex w-auto shrink-0 items-center pr-3">{trailing}</div>
      )}
    </div>
  );
}

export { AbPillInput };
