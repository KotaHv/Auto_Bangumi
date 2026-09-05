import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AbPassword } from '@/components/common/ab-password';
import { AbSelect } from '@/components/common/ab-select';
import { Switch } from '@/components/ui/switch';
import { AbDynamicTags } from '@/components/common/ab-dynamic-tags';
import { cn } from '@/lib/utils';
import type { SettingControlType, SettingFieldConfig } from './types';

type SettingValueFor<TType extends SettingControlType> = TType extends 'input'
  ? string | number | null
  : TType extends 'switch'
    ? boolean
    : TType extends 'select'
      ? string
      : string[];

type SettingFieldProps<TType extends SettingControlType> = Extract<
  SettingFieldConfig,
  { type: TType }
> & {
  value: SettingValueFor<TType>;
  onChange?: (value: SettingValueFor<TType>) => void;
};

type RuntimeSettingFieldProps =
  | SettingFieldProps<'input'>
  | SettingFieldProps<'switch'>
  | SettingFieldProps<'select'>
  | SettingFieldProps<'dynamic-tags'>;

/** Password input with a reveal toggle, keeping the masked style by default. */
function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <AbPassword
      {...props}
      className={cn('w-full', className)}
      inputGroupClassName="w-full sm:w-64"
    />
  );
}

export function SettingField<TType extends SettingControlType>(
  props: SettingFieldProps<TType>,
) {
  const {
    label,
    type,
    prop,
    orientation = 'vertical',
    disabled = false,
    description,
    error,
    value,
    onChange,
    fieldKey,
  } = props as RuntimeSettingFieldProps;
  const labelText = typeof label === 'function' ? label() : label;
  const isDynamicTags = type === 'dynamic-tags';
  const isSwitch = type === 'switch';

  let control: React.ReactNode = null;

  switch (type) {
    case 'switch':
      control = (
        <Switch
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
          value={value as string | null}
          items={prop?.items ?? []}
          triggerClassName="w-full sm:w-64"
          disabled={disabled}
          onValueChange={(nextValue) => onChange?.(nextValue)}
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
                : ((value ?? '') as string | number | readonly string[])
            }
            onChange={(e) => {
              const v =
                prop?.type === 'number'
                  ? Number(e.target.value)
                  : e.target.value;
              onChange?.(Number.isNaN(v) ? e.target.value : v);
            }}
            className="w-full px-2 sm:w-64"
          />
        );
      break;

    case 'dynamic-tags':
      control = (
        <AbDynamicTags
          value={(value as string[]) ?? []}
          disabled={disabled}
          onChange={(nextValue) => onChange?.(nextValue)}
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
            'sm:gap-6',
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
    </div>
  );
}
