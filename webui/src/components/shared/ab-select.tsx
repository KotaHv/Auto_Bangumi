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
  size?: 'sm' | 'default';
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
}

export function AbSelect<T extends string = string>({
  value,
  items,
  onValueChange,
  placeholder,
  triggerClassName,
  size = 'default',
  disabled = false,
  id,
  name,
  required = false,
}: AbSelectProps<T>) {
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled || items.length === 0}
      id={id}
      name={name}
      required={required}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
    >
      <SelectTrigger size={size} className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
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
