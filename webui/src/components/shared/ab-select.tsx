import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AbSelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface AbSelectProps<T extends string = string> {
  value: T | null;
  items: ReadonlyArray<AbSelectOption<T>>;
  onValueChange: (value: T) => void;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  icon?: ReactNode;
  contentAlign?: 'start' | 'center' | 'end';
  alignItemWithTrigger?: boolean;
  'aria-labelledby'?: string;
  name?: string;
  required?: boolean;
}

export function AbSelect<T extends string = string>({
  value,
  items,
  onValueChange,
  placeholder,
  triggerClassName,
  contentClassName,
  size = 'default',
  disabled = false,
  icon,
  contentAlign,
  alignItemWithTrigger,
  'aria-labelledby': ariaLabelledBy,
  name,
  required = false,
}: AbSelectProps<T>) {
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled || items.length === 0}
      name={name}
      required={required}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        aria-labelledby={ariaLabelledBy}
        size={size}
        className={triggerClassName}
      >
        {icon}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent
        className={contentClassName}
        align={contentAlign}
        alignItemWithTrigger={alignItemWithTrigger}
      >
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={item.disabled}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
