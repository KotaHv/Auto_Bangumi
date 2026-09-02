import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AbAddProps {
  round?: boolean;
  type?: 'large' | 'medium' | 'small';
  onClick?: () => void;
}

const SIZE_MAP = {
  large: 'icon-lg',
  medium: 'icon-sm',
  small: 'icon-xs',
} as const;

export function AbAdd({ round = false, type = 'large', onClick }: AbAddProps) {
  return (
    <Button
      size={SIZE_MAP[type]}
      aria-label="add"
      className={round ? 'rounded-full' : ''}
      onClick={onClick}
    >
      <Plus />
    </Button>
  );
}
