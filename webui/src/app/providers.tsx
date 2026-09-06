import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';
import { Toaster } from '@/components/ui/toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/query/client';

export function AppProviders({ children }: { children?: React.ReactNode }) {
  useTranslation();
  useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
