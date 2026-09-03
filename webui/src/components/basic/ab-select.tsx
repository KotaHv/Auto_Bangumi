import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SelectItem as SelectItemType } from '#/components';

interface AbSelectProps {
  value?: SelectItemType | string;
  items: ReadonlyArray<SelectItemType | string>;
  className?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  onChange?: (item: SelectItemType | string) => void;
}

function getLabel(item: SelectItemType | string) {
  return typeof item === 'string' ? item : (item.label ?? item.value);
}

/**
 * Object items are keyed by their `value` (not `id`) so the select's value
 * matches the raw config value passed in from outside.
 */
function getItemValue(item: SelectItemType | string) {
  return typeof item === 'string' ? item : item.value;
}

function isDisabled(item: SelectItemType | string) {
  return typeof item === 'object' && !!item.disabled;
}

export function AbSelect({
  value,
  items,
  className = '',
  size = 'default',
  disabled = false,
  onChange,
}: AbSelectProps) {
  const selected =
    items.find((item) => getItemValue(item) === value) ?? items[0] ?? '';

  const itemsData = items.map((item) => ({
    label: getLabel(item),
    value: getItemValue(item),
    disabled: isDisabled(item),
  }));

  useEffect(() => {
    if (!value && items[0] !== undefined) {
      onChange?.(items[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Select
      items={itemsData}
      value={getItemValue(selected)}
      disabled={disabled}
      onValueChange={(id) => {
        const index = items.findIndex((i) => getItemValue(i) === id);
        if (index !== -1) onChange?.(items[index]);
      }}
    >
      <SelectTrigger size={size} className={className}>
        <SelectValue>{getLabel(selected)}</SelectValue>
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={getItemValue(item)}
              value={getItemValue(item)}
              disabled={isDisabled(item)}
            >
              {getLabel(item)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
