import type { ReactNode } from 'react';
import { toast } from '@/components/ui/toast';

type MessageType = 'success' | 'error' | 'warning';
type MessageOptions = {
  description?: ReactNode;
  timeout?: number;
  priority?: 'low' | 'high';
};

function show(text: string, type: MessageType, options?: MessageOptions) {
  toast.add({ title: text, type, ...options });
}

export const message = {
  success: (text: string, options?: MessageOptions) =>
    show(text, 'success', options),
  error: (text: string, options?: MessageOptions) =>
    show(text, 'error', options),
  warning: (text: string) => show(text, 'warning'),
};
