import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AbSelect } from './basic/ab-select';
import { AbSwitch } from './basic/ab-switch';
import { DynamicTags } from './basic/dynamic-tags';
import { cn } from '@/lib/utils';
import type { AbSettingProps } from '#/components';

interface AbSettingPropsEx extends AbSettingProps {
  value: any;
  onChange?: (value: any) => void;
}

/** Password input with a reveal toggle, keeping the masked style by default. */
function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full sm:w-64">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('w-full pr-8', className)}
      />
      <button
        type="button"
        aria-label={visible ? 'hide password' : 'show password'}
        title={visible ? 'hide password' : 'show password'}
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer transition-colors"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export function AbSetting({
  label,
  type,
  css = '',
  prop,
  bottomLine = false,
  orientation = 'vertical',
  compact = false,
  disabled = false,
  description,
  error,
  value,
  onChange,
  fieldKey,
}: AbSettingPropsEx) {
  const labelText = typeof label === 'function' ? label() : label;
  const isDynamicTags = type === 'dynamic-tags';
  const isSwitch = type === 'switch';

  let control: React.ReactNode = null;

  switch (type) {
    case 'switch':
      control = (
        <AbSwitch
          checked={!!value}
          onCheckedChange={(v) => onChange?.(v)}
          disabled={disabled}
          size={prop?.size ?? 'lg'}
        />
      );
      break;

    case 'select':
      control = (
        <AbSelect
          value={value}
          items={prop?.items ?? []}
          className={cn('w-full sm:w-64', css)}
          disabled={disabled}
          onChange={(item) =>
            onChange?.(typeof item === 'string' ? item : item.value)
          }
        />
      );
      break;

    case 'input':
      control =
        prop?.type === 'password' ? (
          <PasswordInput
            value={(value as string | null) ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={prop?.placeholder}
            disabled={disabled}
            autoComplete="off"
          />
        ) : (
          <Input
            {...prop}
            disabled={disabled}
            value={
              (value === 0 || value === '0') && prop?.placeholder
                ? ''
                : (value ?? '')
            }
            onChange={(e) => {
              const v =
                prop?.type === 'number'
                  ? Number(e.target.value)
                  : e.target.value;
              onChange?.(Number.isNaN(v) ? e.target.value : v);
            }}
            className={cn('w-full sm:w-64', css)}
          />
        );
      break;

    case 'dynamic-tags':
      control = (
        <DynamicTags
          value={(value as string[]) ?? []}
          disabled={disabled}
          onChange={onChange}
        />
      );
      break;
  }

  const feedback =
    error || description ? (
      <p
        className={cn(
          'min-h-4 w-full text-xs leading-4',
          error ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {error ?? description}
      </p>
    ) : null;

  return (
    <div
      data-config-field={fieldKey}
      className={
        orientation === 'horizontal'
          ? cn(
              'flex min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
              !isDynamicTags && 'min-h-9',
            )
          : undefined
      }
    >
      {orientation === 'horizontal' ? (
        // Mobile: label above, control below; sm+: label left, control right.
        <Field
          orientation={isDynamicTags || isSwitch ? 'horizontal' : 'vertical'}
          className={cn(
            'min-w-0 sm:flex-row sm:justify-between',
            isDynamicTags
              ? 'flex-row items-start gap-3 sm:items-start'
              : isSwitch
                ? 'min-h-9 w-full flex-row items-center justify-between gap-3'
                : 'min-h-9 items-center',
            compact ? 'sm:w-fit sm:justify-start sm:gap-2' : 'sm:gap-6',
          )}
          data-invalid={!!error || undefined}
        >
          <FieldLabel
            className={cn(
              'min-w-0 text-sm select-text sm:shrink-0 sm:text-sm',
              isDynamicTags
                ? 'w-fit! flex-none! leading-6'
                : isSwitch
                  ? 'min-w-0 flex-1'
                  : compact
                    ? 'sm:w-auto'
                    : 'sm:w-44',
            )}
          >
            {labelText}
          </FieldLabel>
          <div
            className={cn(
              'flex min-h-9 w-full min-w-0 flex-col items-stretch justify-center gap-1 sm:items-end',
              isDynamicTags
                ? 'min-h-0 w-auto flex-1 items-end justify-start'
                : isSwitch
                  ? 'w-auto shrink-0 items-center'
                  : 'sm:w-auto',
            )}
          >
            {control}
            {feedback}
          </div>
        </Field>
      ) : (
        <Field orientation="vertical" data-invalid={!!error || undefined}>
          <FieldLabel>{labelText}</FieldLabel>
          <div className="mt-1">{control}</div>
          {feedback}
        </Field>
      )}

      {bottomLine && <Separator className="my-3" />}
    </div>
  );
}
