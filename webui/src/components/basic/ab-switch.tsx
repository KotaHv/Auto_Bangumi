import { Switch } from '@/components/ui/switch';

interface AbSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function AbSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'default',
}: AbSwitchProps) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      size={size}
    />
  );
}
