import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface AbLoadErrorProps {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}

export function AbLoadError({ title, retryLabel, onRetry }: AbLoadErrorProps) {
  return (
    <Empty className="h-full min-h-0">
      <EmptyMedia variant="icon" className="text-destructive">
        <CircleAlert />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
      <Button variant="brand" className="mt-1 px-4 py-2" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Empty>
  );
}
