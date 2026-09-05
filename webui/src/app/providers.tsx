import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';
import { Toaster } from '@/components/ui/toast';

export function AppProviders({ children }: { children?: React.ReactNode }) {
  useTranslation();
  useTheme();
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
