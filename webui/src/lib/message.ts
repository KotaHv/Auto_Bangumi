import { toast } from '@/components/ui/toast';

type MessageType = 'success' | 'error' | 'warning';

function show(text: string, type: MessageType) {
  toast.add({ title: text, type });
}

export const message = {
  success: (text: string) => show(text, 'success'),
  error: (text: string) => show(text, 'error'),
  warning: (text: string) => show(text, 'warning'),
};
