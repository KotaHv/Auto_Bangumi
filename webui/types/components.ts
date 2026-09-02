export interface SelectItem {
  id: number;
  label?: string;
  value: string;
  disabled?: boolean;
}

export interface AbSettingProps {
  label: string | (() => string);
  type: 'input' | 'switch' | 'select' | 'dynamic-tags';
  css?: string;
  prop?: any;
  bottomLine?: boolean;
  orientation?: 'vertical' | 'horizontal';
  /** Use a compact label width for dense horizontal layouts. */
  compact?: boolean;
  /** Disable the control without hiding it (e.g. when its section is off). */
  disabled?: boolean;
  /** Helper text rendered below the control. */
  description?: string;
  /** Inline error message rendered below the control. */
  error?: string;
  /** Stable field identifier used for validation focus and scrolling. */
  fieldKey?: string;
}

export type SettingItem<T> = AbSettingProps & {
  configKey: keyof T;
};
