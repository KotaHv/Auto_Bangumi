import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface AbButtonProps {
  type?: 'primary' | 'warn' | 'brand' | 'outline' | 'ghost';
  size?: 'big' | 'normal' | 'small';
  link?: string | null;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  className?: string;
}

const SIZE_MAP = {
  big: 'lg',
  normal: 'default',
  small: 'sm',
} as const;

export function AbButton({
  type = 'primary',
  size = 'normal',
  link = null,
  loading = false,
  disabled = false,
  onClick,
  children,
  className = '',
}: AbButtonProps) {
  const variant =
    type === 'warn'
      ? 'destructive-solid'
      : type === 'brand'
        ? 'brand'
        : type === 'outline'
          ? 'outline'
          : type === 'ghost'
            ? 'ghost'
            : 'default';
  const inner = (
    <>
      {loading && <Spinner data-icon="inline-start" />}
      {children}
    </>
  );

  if (link !== null) {
    return (
      <Button
        render={<a href={link} />}
        nativeButton={false}
        variant={variant}
        size={SIZE_MAP[size]}
        onClick={onClick}
        disabled={loading || disabled}
        className={className}
      >
        {inner}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={SIZE_MAP[size]}
      onClick={onClick}
      disabled={loading || disabled}
      className={className}
    >
      {inner}
    </Button>
  );
}
