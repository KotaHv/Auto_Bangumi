import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

export type AbInputVariant =
  'default' | 'large' | 'pill' | 'title' | 'search' | 'tag';

interface AbInputProps extends React.ComponentProps<typeof Input> {
  variant?: AbInputVariant;
  endAddon?: React.ReactNode;
  inputGroupClassName?: string;
}

const INPUT_VARIANTS: Record<AbInputVariant, string> = {
  default: 'px-2',
  large: 'h-10',
  pill: 'h-12 rounded-full bg-card px-5 text-base shadow-none placeholder:text-base focus-visible:border-brand md:text-base md:placeholder:text-base dark:bg-white/5',
  title:
    'font-display h-6 rounded-none border-0 bg-transparent px-0 pb-0.5 font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-lg dark:bg-transparent',
  search:
    'h-10 min-w-0 flex-1 self-center rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 md:h-8 dark:bg-transparent dark:hover:bg-transparent',
  tag: 'h-auto min-h-6 w-20 rounded-md border-dashed bg-transparent px-2 text-xs outline-none',
};

const GROUP_VARIANTS: Partial<Record<AbInputVariant, string>> = {
  pill: 'h-12 rounded-full bg-card focus-within:border-brand dark:bg-white/5',
};

const GROUP_INPUT_VARIANTS: Partial<Record<AbInputVariant, string>> = {
  pill: 'h-full rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent',
};

function AbInput({
  variant = 'default',
  endAddon,
  inputGroupClassName,
  className,
  ...props
}: AbInputProps) {
  const inputClassName = cn(INPUT_VARIANTS[variant], className);

  if (endAddon === undefined) {
    return <Input {...props} className={inputClassName} />;
  }

  return (
    <InputGroup className={cn(GROUP_VARIANTS[variant], inputGroupClassName)}>
      <InputGroupInput
        {...props}
        className={cn(inputClassName, GROUP_INPUT_VARIANTS[variant])}
      />

      <InputGroupAddon
        align="inline-end"
        className={variant === 'pill' ? 'pr-5' : 'pr-2'}
      >
        {endAddon}
      </InputGroupAddon>
    </InputGroup>
  );
}

export { AbInput };
