import type { ComponentProps } from 'react';
import type { AbSelectOption } from '@/components/common/ab-select';

type ConfigInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'disabled' | 'className'
>;

interface ConfigFieldBase {
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

export type ConfigControlType = 'input' | 'switch' | 'select' | 'dynamic-tags';

export type ConfigFieldDefinition = ConfigFieldBase &
  (
    | {
        type: 'input';
        prop?: ConfigInputProps;
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

export type ConfigFieldItem<T> = ConfigFieldDefinition & {
  configKey: keyof T;
};
