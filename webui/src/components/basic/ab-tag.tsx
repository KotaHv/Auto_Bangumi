import { Badge } from '@/components/ui/badge';

interface AbTagProps {
  type?: 'primary' | 'warn' | 'inactive' | 'active' | 'notify';
  title: string;
}

const VARIANT_MAP = {
  primary: 'primary',
  warn: 'destructive',
  inactive: 'inactive',
  active: 'active',
  notify: 'notify',
} as const;

export function AbTag({ type = 'primary', title }: AbTagProps) {
  return <Badge variant={VARIANT_MAP[type]}>{title}</Badge>;
}
