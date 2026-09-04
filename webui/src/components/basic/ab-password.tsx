import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { AbInput, type AbInputVariant } from './ab-input';
import { InputGroupButton } from '@/components/ui/input-group';

type AbPasswordProps = Omit<
  React.ComponentProps<typeof AbInput>,
  'type' | 'endAddon'
> & { variant?: AbInputVariant };

export function AbPassword({ id, ...props }: AbPasswordProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AbInput
      {...props}
      id={inputId}
      type={showPassword ? 'text' : 'password'}
      endAddon={
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
      }
    />
  );
}
