import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function AbPillInput({
  trailing,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { trailing?: React.ReactNode }) {
  return (
    <div className="relative w-full">
      <Input
        {...props}
        className={cn(
          'bg-card focus-visible:border-brand focus-visible:ring-brand/20 dark:focus-visible:ring-brand/25 h-12 w-full rounded-full px-5 text-base shadow-none placeholder:text-base md:text-base md:placeholder:text-base dark:bg-white/5',
          trailing && 'pr-12 pl-5',
          className,
        )}
      />
      {trailing && (
        <div className="absolute top-1/2 right-6 -translate-y-1/2">
          {trailing}
        </div>
      )}
    </div>
  );
}

export { AbPillInput };
