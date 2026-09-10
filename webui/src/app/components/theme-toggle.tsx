import { Moon, Sun, SunMoon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/use-theme';

export function ThemeToggle() {
  const { mode, cycle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="toggle theme"
      title="toggle theme"
      onClick={cycle}
    >
      {mode === 'light' ? <Sun /> : mode === 'dark' ? <Moon /> : <SunMoon />}
    </Button>
  );
}
