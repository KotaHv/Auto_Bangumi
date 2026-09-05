import { toast } from '@/components/ui/toast';

export type MessageType = 'success' | 'error' | 'warning';

export const message = {
  success: (text: string) => toast.add({ title: text, type: 'success' }),
  error: (text: string) => toast.add({ title: text, type: 'error' }),
  warning: (text: string) => toast.add({ title: text, type: 'warning' }),
};
