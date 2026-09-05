import type { ComponentProps } from 'react';
import type { AbSelectOption } from '@/components/basic/ab-select';

type SettingInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'disabled' | 'className'
>;

interface SettingFieldBase {
  label: string | (() => string);
  orientation?: 'vertical' | 'horizontal';
  /** Disable the control without hiding it (e.g. when its section is off). */
  disabled?: boolean;
  /** Helper text rendered below the control. */
  description?: string;
  /** Inline error message rendered below the control. */
  error?: string;
  /** Stable field identifier used for validation focus and scrolling. */
  fieldKey?: string;
}

export type SettingControlType = 'input' | 'switch' | 'select' | 'dynamic-tags';

export type SettingFieldConfig = SettingFieldBase &
  (
    | {
        type: 'input';
        prop?: SettingInputProps;
      }
    | {
        type: 'switch';
        prop?: {
          size?: 'sm' | 'default' | 'lg';
        };
      }
    | {
        type: 'select';
        prop: {
          items: ReadonlyArray<AbSelectOption>;
        };
      }
    | {
        type: 'dynamic-tags';
        prop?: never;
      }
  );

export type SettingItem<T> = SettingFieldConfig & {
  configKey: keyof T;
};
