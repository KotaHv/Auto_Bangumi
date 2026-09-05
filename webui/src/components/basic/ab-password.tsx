import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

type AbPasswordVariant = 'default' | 'pill';

type AbPasswordProps = Omit<React.ComponentProps<'input'>, 'type'> & {
  variant?: AbPasswordVariant;
  inputGroupClassName?: string;
};

const passwordVariants = {
  default: {
    inputGroup: '',
    inputGroupInput: 'px-2',
  },
  pill: {
    inputGroup:
      'bg-card focus-within:border-brand h-12 rounded-full dark:bg-white/5',
    inputGroupInput:
      'h-full rounded-none border-0 bg-transparent px-5 text-base shadow-none placeholder:text-base focus-visible:border-transparent focus-visible:ring-0 md:text-base md:placeholder:text-base dark:bg-transparent',
  },
} satisfies Record<
  AbPasswordVariant,
  {
    inputGroup: string;
    inputGroupInput: string;
  }
>;

export function AbPassword({
  id,
  variant = 'default',
  inputGroupClassName,
  className,
  ...props
}: AbPasswordProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputGroup
      className={cn(passwordVariants[variant].inputGroup, inputGroupClassName)}
    >
      <InputGroupInput
        {...props}
        id={inputId}
        type={showPassword ? 'text' : 'password'}
        className={cn(passwordVariants[variant].inputGroupInput, className)}
      />
      <InputGroupButton
        size="icon-xs"
        aria-label={
          showPassword ? t('login.hide_password') : t('login.show_password')
        }
        aria-pressed={showPassword}
        aria-controls={inputId}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShowPassword((v) => !v)}
      >
        {showPassword ? (
          <EyeOff className="size-5" />
        ) : (
          <Eye className="size-5" />
        )}
      </InputGroupButton>
    </InputGroup>
  );
}
